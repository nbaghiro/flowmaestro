# Product-Focused Node Reorganization Plan

## Summary

**Target**: Non-technical users
**Approach**: Use-Case First (Gumloop Style)
**Integration Visibility**: Top-level category with MCP badges
**Advanced Nodes**: Hidden (replaced by purpose-built alternatives)

---

## Analysis of Gumloop Screenshots

### Key UI Patterns Observed

1. **Two-Level Navigation**: Main menu → Category drill-down with back arrow
2. **Consistent Card Design**: Icon + Title + Description (2 lines max)
3. **Search Persistent**: "Search all nodes" appears at every level
4. **Frequently Used Section**: 6-item grid (2x3) on main view with compact cards
5. **Integrations Section**: Flat list with MCP badges, provider logos
6. **Category Depth**: Most categories have 10-15 nodes max
7. **Descriptions**: Action-oriented, explain what the node does and output format

### Gumloop Category Structure (from screenshots)

```
Main Menu:
├── Core Nodes (→ drill down)
├── Using AI (→ drill down)
├── Triggers (→ drill down)
├── Your Custom Nodes (→ drill down)
├── Subflows (→ drill down)
├── [Frequently Used - 6 items grid]
└── [Integrations - flat list with MCP badges]

Core Nodes submenu:
├── Using AI
├── Web Scraping
├── Flow Basics
├── Text Manipulation
├── Browser Extension
├── File Operations
├── Advanced
├── Data Enrichment
├── JSON
├── PDF
├── List Operations
├── Notifications
└── Audio Processing

Using AI submenu:
├── Ask AI
├── Extract Data
├── Categorizer
├── Generate Image
├── AI Web Research
├── Analyze Image
├── Analyze Video
├── AI List Sorter
├── Scorer
└── OpenAI Assistant

Triggers submenu:
├── Create a Time Trigger (highlighted in pink)
├── Google Drive Folder Reader
├── Google Sheets Reader
├── Google Calendar Event Reader
├── Gmail Reader
├── Slack Message Reader
├── Notion Database Reader
├── Airtable Reader
├── HubSpot List Reader
└── Zendesk Ticket Reader
```

---

## Example Non-Technical User Workflows

These examples justify which nodes are essential:

### Workflow 1: "Email Lead Qualification"

**User**: Sales manager wants to auto-categorize incoming leads

```
Gmail Reader → Extract Data → Categorizer → Google Sheets Writer
```

**Nodes needed**: Gmail Reader, Extract Data, Categorizer, Google Sheets Writer

### Workflow 2: "Weekly Report Summarizer"

**User**: Executive wants a summary of team updates from Slack

```
Time Trigger → Slack Message Reader → Summarizer → Send Email
```

**Nodes needed**: Time Trigger, Slack Reader, Summarizer, Gmail Sender

### Workflow 3: "Invoice Data Extraction"

**User**: Accountant wants to extract data from PDF invoices

```
Google Drive Folder Reader → Parse PDF → Extract Data → Airtable Writer
```

**Nodes needed**: Google Drive Reader, Parse PDF, Extract Data, Airtable Writer

### Workflow 4: "Customer Feedback Analysis"

**User**: Product manager wants sentiment analysis on support tickets

```
Zendesk Reader → Sentiment Analyzer → Categorizer → Slack Notification
```

**Nodes needed**: Zendesk Reader, Sentiment Analyzer, Categorizer, Slack Sender

### Workflow 5: "Content Repurposing"

**User**: Marketer wants to turn blog posts into social media

```
Input (URL) → Web Scraper → Ask AI (rewrite) → Output
```

**Nodes needed**: Input, Web Scraper, Ask AI, Output

### Workflow 6: "Document Translation Pipeline"

**User**: Translator wants to process multilingual documents

```
Google Drive Reader → Parse Document → Translator → Google Drive Writer
```

**Nodes needed**: Google Drive Reader, Parse Document, Translator, Google Drive Writer

---

## Gumloop Node Structure (Reference)

### Main Menu (Top Level)

```
┌─────────────────────────────────────────┐
│ ← Nodes                            [⊞]  │
├─────────────────────────────────────────┤
│ 🔍 Search nodes...                      │
├─────────────────────────────────────────┤
│ ⊞ Core Nodes                         →  │
│   Essential components for workflows    │
│                                         │
│ 🤖 Using AI                          →  │
│   Leverage AI for various tasks         │
│                                         │
│ ⏰ Triggers                           →  │
│   Start workflows automatically         │
│                                         │
│ 🔧 Your Custom Nodes                  →  │
│   Create your own nodes                 │
│                                         │
│ 📦 Subflows                           →  │
│   Reusable workflow components          │
├─────────────────────────────────────────┤
│ Frequently Used                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Ask AI  │ │  Input  │ │ Extract │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Output  │ │Categor. │ │ Router  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│ Integrations                            │
│ 📊 Airtable                      [MCP]→ │
│ 📧 Gmail                         [MCP]→ │
│ 📋 Google Sheets                 [MCP]→ │
│ 📁 Google Drive                  [MCP]→ │
│ 📅 Google Calendar               [MCP]→ │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Core Nodes (Drill-down)

```
← Core Nodes
🔍 Search all nodes...

🤖 Using AI                              →
   Leverage AI for various tasks

🌐 Web Scraping                          →
   Extract data from websites

⚡ Flow Basics                            →
   Essential workflow components

📝 Text Manipulation                     →
   Process and modify text content

📁 File Operations                       →
   Manage and manipulate files

📊 Data Operations                       →
   Transform and process data

📄 PDF                                   →
   Extract and manipulate PDF content

📋 JSON                                  →
   Create and parse JSON data

📑 List Operations                       →
   Manipulate and process lists

🔔 Notifications                         →
   Send alerts via different channels

🎵 Audio Processing                      →
   Convert between text and speech

🔧 Advanced                              →
   Complex operations for power users
```

### Using AI (Drill-down)

```
← Using AI
🔍 Search all nodes...

💬 Ask AI
   Prompt an AI language model. Provide context
   and use detailed prompts for best results.

📋 Extract Data
   Extract key pieces of information or a list
   of information from some input text.

🏷️ Categorizer
   Categorize data using AI into custom buckets
   defined with natural language descriptions.

🎨 Generate Image
   Generate an image using AI models. Generated
   images are stored at publicly accessible URLs.

🔍 AI Web Research
   Perform web research tasks with structured
   dynamic inputs and outputs.

👁️ Analyze Image
   Analyze images with AI vision (multimodal LLMs).
   Great for extracting text from images.

🎬 Analyze Video
   Analyze videos with AI vision. Great for
   extracting text and generating descriptions.

📊 AI List Sorter
   Reorder a list of items according to criteria.
   Most effective for shorter lists.

⭐ Scorer
   Assign a numerical score from 0 to 100 based
   on predefined criteria.

💡 Summarizer
   Condense long content into concise summaries.
   Configurable length and focus areas.

🌐 Translator
   Translate text between languages using AI.
   Supports 50+ languages.

😊 Sentiment Analyzer
   Analyze the emotional tone of text. Returns
   sentiment score and classification.
```

### Triggers (Drill-down)

```
← Triggers
🔍 Search all nodes...

⏰ Create a Time Trigger          [highlighted]
   Schedule your flow to run at specified times.

📁 Google Drive Folder Reader
   Read content from a Google Drive folder and
   outputs a list of files with URLs.

📊 Google Sheets Reader
   Read content from a Google Sheets file and
   outputs a list of the data in each column.

📅 Google Calendar Event Reader
   Read Google Calendar events by choosing a
   time frame.

📧 Gmail Reader
   Read all unread emails from your Gmail folder
   (standard inbox is the default).

💬 Slack Message Reader
   Read the last n Slack messages from a
   specified channel.

📝 Notion Database Reader
   Read rows from your Notion database.

📊 Airtable Reader
   Read data from an Airtable base.

🎫 HubSpot List Reader
   Load data from HubSpot lists. Supports Contacts,
   Companies, Deals, Tickets, Orders.

🎟️ Zendesk Ticket Reader
   Load Ticket data from Zendesk including type,
   priority, status, subject, description.
```

### Flow Basics (under Core Nodes)

```
← Flow Basics
🔍 Search all nodes...

📥 Input
   Entry point for your workflow. Define the
   data structure your workflow accepts.

📤 Output
   Exit point for your workflow. Pass the final
   result to be displayed or returned.

🔀 Router
   Control workflow direction based on conditions.
   Route data to different branches.

⏸️ Wait/Delay
   Pause workflow execution for a specified
   duration before continuing.

🔁 Loop
   Iterate over a list of items and process
   each one individually.

❓ If/Else
   Branch your workflow based on a condition.
   True goes one way, false goes another.

🔀 Switch
   Multi-way branching based on a value.
   Like if/else but with many options.
```

### Integrations (Flat list with drill-down per provider)

Each integration expands to show available actions:

```
← Gmail                               [MCP]
🔍 Search all nodes...

📥 Read Emails
   Read emails from your Gmail inbox with
   filters for sender, subject, date range.

📤 Send Email
   Send an email from your Gmail account.
   Supports HTML content and attachments.

🔍 Search Emails
   Search your Gmail with advanced query syntax.
   Returns matching emails.

📎 Get Attachments
   Download attachments from specified emails.
   Returns file URLs.
```

---

## Complete Node Inventory (Gumloop Reference)

### Core Nodes → Using AI (12 nodes)

| Node               | Description                                | Wraps                            |
| ------------------ | ------------------------------------------ | -------------------------------- |
| Ask AI             | General LLM prompt with context            | `llm-executor`                   |
| Extract Data       | Structured data extraction from text       | `llm-executor`                   |
| Categorizer        | Classify into custom categories            | `llm-executor`                   |
| Generate Image     | Create images with DALL-E/Stable Diffusion | `vision-executor`                |
| AI Web Research    | Search + synthesize web results            | `llm-executor` + `http-executor` |
| Analyze Image      | Vision model for image understanding       | `vision-executor`                |
| Analyze Video      | Frame extraction + vision analysis         | `vision-executor`                |
| AI List Sorter     | Reorder items by criteria                  | `llm-executor`                   |
| Scorer             | Assign 0-100 score based on criteria       | `llm-executor`                   |
| Summarizer         | Condense long content                      | `llm-executor`                   |
| Translator         | Multi-language translation                 | `llm-executor`                   |
| Sentiment Analyzer | Emotion/tone analysis                      | `llm-executor`                   |

### Core Nodes → Web Scraping (4 nodes)

| Node                 | Description                 |
| -------------------- | --------------------------- |
| Scrape Website       | Extract content from a URL  |
| Scrape Multiple URLs | Batch scrape multiple pages |
| Screenshot Website   | Capture webpage as image    |
| Extract Links        | Get all links from a page   |

### Core Nodes → Flow Basics (7 nodes)

| Node       | Description           |
| ---------- | --------------------- |
| Input      | Workflow entry point  |
| Output     | Workflow result       |
| Router     | Conditional branching |
| Wait/Delay | Pause execution       |
| Loop       | Iterate over arrays   |
| If/Else    | Binary branching      |
| Switch     | Multi-way branching   |

### Core Nodes → Text Manipulation (6 nodes)

| Node            | Description                  |
| --------------- | ---------------------------- |
| Find & Replace  | Search and replace text      |
| Split Text      | Split by delimiter           |
| Join Text       | Combine text pieces          |
| Format Text     | Apply templates              |
| Trim/Clean Text | Remove whitespace, normalize |
| Regex Extract   | Extract with patterns        |

### Core Nodes → File Operations (5 nodes)

| Node         | Description            |
| ------------ | ---------------------- |
| Read File    | Read file contents     |
| Write File   | Create/update file     |
| Convert File | Change file format     |
| Merge Files  | Combine multiple files |
| Zip/Unzip    | Compress/decompress    |

### Core Nodes → PDF (4 nodes)

| Node               | Description             |
| ------------------ | ----------------------- |
| Parse PDF          | Extract text from PDF   |
| PDF to Images      | Convert pages to images |
| Merge PDFs         | Combine multiple PDFs   |
| Extract PDF Tables | Get tables as data      |

### Core Nodes → JSON (4 nodes)

| Node            | Description              |
| --------------- | ------------------------ |
| Parse JSON      | Convert string to object |
| Build JSON      | Create JSON from fields  |
| JSON Path Query | Extract with JSONPath    |
| Validate JSON   | Check against schema     |

### Core Nodes → Data Operations (5 nodes)

| Node          | Description           |
| ------------- | --------------------- |
| Filter Data   | Filter arrays/objects |
| Map/Transform | Transform each item   |
| Aggregate     | Sum, count, average   |
| Sort          | Order by field        |
| Deduplicate   | Remove duplicates     |

### Core Nodes → List Operations (4 nodes)

| Node        | Description        |
| ----------- | ------------------ |
| Get Item    | Get item by index  |
| Slice List  | Get subset of list |
| Merge Lists | Combine lists      |
| List Length | Count items        |

### Core Nodes → Notifications (4 nodes)

| Node               | Description             |
| ------------------ | ----------------------- |
| Send Email         | Generic email sending   |
| Send SMS           | Text message via Twilio |
| Send Slack Message | Post to Slack           |
| Send Webhook       | HTTP POST notification  |

### Core Nodes → Audio Processing (3 nodes)

| Node            | Description            |
| --------------- | ---------------------- |
| Speech to Text  | Transcribe audio       |
| Text to Speech  | Generate audio         |
| Translate Audio | Transcribe + translate |

### Core Nodes → Advanced (5 nodes)

| Node           | Description       |
| -------------- | ----------------- |
| HTTP Request   | Raw HTTP calls    |
| Run Code       | JavaScript/Python |
| Database Query | SQL/NoSQL         |
| Set Variable   | Store values      |
| Get Variable   | Retrieve values   |

### Triggers (10+ nodes)

| Node                 | Description              |
| -------------------- | ------------------------ |
| Time Trigger         | Cron-based scheduling    |
| Webhook Trigger      | HTTP endpoint            |
| Gmail Reader         | New email trigger        |
| Google Drive Reader  | New file trigger         |
| Google Sheets Reader | New row trigger          |
| Slack Message Reader | New message trigger      |
| Airtable Reader      | New record trigger       |
| Notion Reader        | New page trigger         |
| HubSpot Reader       | New contact/deal trigger |
| Zendesk Reader       | New ticket trigger       |

### Integrations (MCP-based, 15+ providers)

Each integration has Read/Write/Search/Delete actions:

| Provider        | Actions                               |
| --------------- | ------------------------------------- |
| Gmail           | Read, Send, Search, Get Attachments   |
| Google Sheets   | Read Rows, Write Rows, Update, Delete |
| Google Drive    | List, Read, Upload, Delete, Share     |
| Google Calendar | List Events, Create, Update, Delete   |
| Google Docs     | Read, Create, Update                  |
| Slack           | Read, Send, Update, Delete            |
| Airtable        | Read, Create, Update, Delete          |
| Notion          | Read, Create, Update, Query           |
| HubSpot         | Contacts, Companies, Deals, Tickets   |
| Salesforce      | Leads, Opportunities, Contacts        |
| Zendesk         | Tickets, Users, Organizations         |
| Outlook         | Read, Send, Calendar                  |
| Microsoft Teams | Send, Read Channels                   |
| Trello          | Cards, Lists, Boards                  |
| Asana           | Tasks, Projects                       |

---

## Estimated Node Count

| Category     | Subcategory                  | Count          |
| ------------ | ---------------------------- | -------------- |
| Core Nodes   | Using AI                     | 12             |
| Core Nodes   | Web Scraping                 | 4              |
| Core Nodes   | Flow Basics                  | 7              |
| Core Nodes   | Text Manipulation            | 6              |
| Core Nodes   | File Operations              | 5              |
| Core Nodes   | PDF                          | 4              |
| Core Nodes   | JSON                         | 4              |
| Core Nodes   | Data Operations              | 5              |
| Core Nodes   | List Operations              | 4              |
| Core Nodes   | Notifications                | 4              |
| Core Nodes   | Audio Processing             | 3              |
| Core Nodes   | Advanced                     | 5              |
| Triggers     | -                            | 10             |
| Integrations | 15 providers × 4 actions avg | ~60            |
| **Total**    |                              | **~133 nodes** |
