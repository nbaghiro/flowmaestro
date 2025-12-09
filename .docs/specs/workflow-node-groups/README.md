# Workflow Nodes Spec

## Overview

Transform FlowMaestro's node system from **generic primitives** to **purpose-built nodes** for non-technical users.

|            | Before                      | After                        |
| ---------- | --------------------------- | ---------------------------- |
| **Nodes**  | ~25 technical primitives    | ~130+ purpose-built          |
| **Users**  | Developers only             | Business users               |
| **Config** | Code/API knowledge required | Natural language + guided UI |

---

## Why This Change?

### The Problem

Today's workflow builder exposes low-level primitives:

```
Current Node List:
├── LLM Node (requires prompt engineering)
├── HTTP Request (requires API knowledge)
├── Transform (requires JSON/template syntax)
├── Condition (requires expression syntax)
├── Code (requires JavaScript)
├── Integration Node (generic for all providers)
└── ...
```

This creates barriers for non-technical users:

- **Cognitive Load**: Users must understand how to compose primitives
- **Configuration Complexity**: Each node requires technical configuration
- **No Guidance**: No clear path from "what I want to do" to "how to do it"
- **Hidden Patterns**: Common workflows require rediscovering the same patterns

### The Solution

Purpose-built nodes that match how users think about their work:

```
New Node Categories:
├── AI & Agents
│   ├── Ask AI (not "LLM with prompt template")
│   ├── Extract Data (not "LLM with JSON schema")
│   ├── Categorizer (not "LLM with classification prompt")
│   └── ...
├── Knowledge
│   ├── Search Knowledge Base (not "Vector DB query + LLM")
│   └── ...
├── Automations
│   ├── On New Email (not "Gmail API polling + webhook")
│   └── ...
└── Integrations
    ├── Gmail Send (not "HTTP + OAuth + Gmail API")
    └── ...
```

---

## What's Changing

### 1. Node Organization

**Before**: Flat list of ~25 technical nodes

**After**: Hierarchical categories with ~160 purpose-built nodes

| Category         | Description                          | Node Count   |
| ---------------- | ------------------------------------ | ------------ |
| **AI & Agents**  | AI models, agents, and intelligence  | 18           |
| **Knowledge**    | RAG, search, and knowledge bases     | 5            |
| **Automations**  | Triggers and scheduled workflows     | 12           |
| **Tools**        | Data processing and utilities        | 35           |
| **Governance**   | Security, compliance, and operations | 6            |
| **Integrations** | Third-party service connections      | ~80          |
| **Custom Nodes** | User-created reusable nodes          | User-defined |
| **Subflows**     | Composable workflow components       | User-defined |

### 2. Node Abstraction Level

**Before**: Technical primitives requiring expertise

| Old Node     | Required Knowledge                                      |
| ------------ | ------------------------------------------------------- |
| LLM Node     | Prompt engineering, model selection, temperature tuning |
| HTTP Request | REST APIs, authentication, headers, response parsing    |
| Transform    | JSON templates, variable syntax, data structures        |
| Condition    | Expression syntax, boolean logic                        |

**After**: Purpose-built nodes with guided configuration

| New Node     | User Experience                                |
| ------------ | ---------------------------------------------- |
| Ask AI       | Select model, write plain prompt, get response |
| Extract Data | Define fields you want, AI extracts them       |
| Categorizer  | List your categories, AI classifies content    |
| Gmail Send   | Connect account, write message, send           |

### 3. UI (Preserved)

The existing UI patterns remain unchanged:

- **Left Sidebar**: Node library panel for browsing and adding nodes
- **Right Panel**: NodeInspector for configuring selected node
- **Canvas**: React Flow canvas for workflow building

---

## Node Categories Deep Dive

### AI & Agents (18 nodes)

Transform raw LLM access into task-specific AI tools:

| Node               | Purpose               | Replaces                        |
| ------------------ | --------------------- | ------------------------------- |
| Ask AI             | General AI prompts    | LLM Node                        |
| Extract Data       | Structured extraction | LLM + JSON schema               |
| Categorizer        | Classification        | LLM + category prompt           |
| Summarizer         | Content condensation  | LLM + summary prompt            |
| Translator         | Language translation  | LLM + translation prompt        |
| Sentiment Analyzer | Tone detection        | LLM + sentiment prompt          |
| Scorer             | Content rating        | LLM + scoring criteria          |
| AI List Sorter     | Semantic ordering     | LLM + ranking prompt            |
| Generate Image     | Image creation        | DALL-E API                      |
| Analyze Image      | Vision AI             | GPT-4V API                      |
| Analyze Video      | Video processing      | Multi-frame vision              |
| Run Agent          | Agent execution       | Complex agent orchestration     |
| Agent Chat         | Conversational AI     | Multi-turn agent loop           |
| Agent Handoff      | Agent transfer        | Custom handoff logic            |
| Human-in-the-Loop  | Human approval        | Pause + notification + resume   |
| Compare Models     | Model evaluation      | Multiple LLM calls + comparison |
| Model Router       | Smart routing         | Complexity analysis + routing   |

### Knowledge (5 nodes)

Enterprise-grade RAG without infrastructure complexity:

| Node                  | Purpose            | What It Abstracts                          |
| --------------------- | ------------------ | ------------------------------------------ |
| Search Knowledge Base | Semantic search    | Vector DB + embeddings + relevance scoring |
| Add to Knowledge Base | Document ingestion | Chunking + embedding + storage             |
| Knowledge Base Chat   | RAG Q&A            | Search + context injection + LLM           |
| Sync Knowledge Source | Continuous sync    | Scheduling + diffing + updates             |
| Knowledge Analytics   | Usage insights     | Query logging + gap analysis               |

### Governance & Security (6 nodes)

Compliance and governance without custom development:

| Node            | Purpose            | What It Abstracts                          |
| --------------- | ------------------ | ------------------------------------------ |
| Approval Gate   | Human sign-off     | Notification + wait + timeout + escalation |
| Audit Log       | Compliance logging | Multi-destination logging + retention      |
| PII Redactor    | Data masking       | Pattern detection + redaction              |
| Encrypt/Decrypt | Data security      | KMS + encryption algorithms                |
| Rate Limiter    | Throttling         | Token bucket + queuing                     |
| Circuit Breaker | Fault tolerance    | Failure tracking + recovery                |

---

## Real-World Workflow Examples

### Example 1: Customer Support Automation

**Business Need**: Automatically categorize and route support tickets, respond to simple queries, escalate complex ones.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Support Ticket Automation                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ On New Email │───▶│ PII Redactor │───▶│ Categorizer  │───▶│ Router       │
│              │    │              │    │              │    │              │
│ Folder:      │    │ Mask:        │    │ Categories:  │    │ Based on     │
│ Support      │    │ - SSN        │    │ - Billing    │    │ category +   │
│              │    │ - Credit card│    │ - Technical  │    │ sentiment    │
└──────────────┘    │ - Phone      │    │ - Sales      │    └──────────────┘
                    └──────────────┘    │ - General    │          │
                                        └──────────────┘    ┌─────┴─────────┐
                                                            ▼               ▼
                                                       Simple          Complex
                                                            │               │
                                                            ▼               ▼
                                                    ┌──────────────┐ ┌──────────────┐
                                                    │ KB Chat      │ │ Agent Chat   │
                                                    │              │ │              │
                                                    │ Answer from  │ │ Multi-turn   │
                                                    │ help docs    │ │ with tools   │
                                                    └──────────────┘ └──────────────┘
                                                            │               │
                                                            ▼               ▼
                                                    ┌──────────────┐ ┌──────────────┐
                                                    │ Gmail Send   │ │ Router       │
                                                    │              │ │ (resolved?)  │
                                                    │ Auto-reply   │ └──────────────┘
                                                    └──────────────┘        │
                                                                      ┌─────┴─────┐
                                                                      ▼           ▼
                                                                 Resolved    Escalate
                                                                      │           │
                                                                      ▼           ▼
                                                               Close ticket  Human agent

**Impact**: 70% of tickets auto-resolved, response time from hours to seconds
```

---

### Example 2: Lead Enrichment & Qualification

**Business Need**: When a new lead signs up, automatically research their company, score the lead, and route to appropriate sales team.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Lead Enrichment Pipeline                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───▶│ Run Agent    │───▶│ Scorer       │
│              │    │              │    │              │
│ Stripe new   │    │ "Company     │    │ Criteria:    │
│ customer     │    │ Researcher"  │    │ - Size >100  │
│ event        │    │              │    │ - SaaS/Tech  │
└──────────────┘    │ Tools:       │    │ - VP+ title  │
                    │ - Web search │    │ - Clear need │
                    │ - LinkedIn   │    └──────────────┘
                    │ - Clearbit   │          │
                    └──────────────┘          ▼
                                        ┌──────────────┐
                                        │ Router       │
                                        │              │
                                        │ score > 80   │───▶ Enterprise team
                                        │ score > 50   │───▶ Mid-market team
                                        │ default      │───▶ SMB team
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ HubSpot      │
                                        │ Create Lead  │
                                        │              │
                                        │ With all     │
                                        │ enriched     │
                                        │ data + score │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Slack        │
                                        │ #sales-leads │
                                        │              │
                                        │ "New hot     │
                                        │ lead: ..."   │
                                        └──────────────┘

**Impact**: Sales team gets qualified, enriched leads instantly with AI-generated company summaries
```

---

### Example 3: Content Review Pipeline

**Business Need**: AI generates blog content weekly, but requires human approval before publishing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Content Review Pipeline                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Schedule     │───▶│ Search KB    │───▶│ Ask AI       │
│              │    │              │    │              │
│ Every Monday │    │ "Product     │    │ "Write a     │
│ 9am          │    │ Updates"     │    │ blog post    │
│              │    │              │    │ about..."    │
└──────────────┘    │ Last 7 days  │    │              │
                    └──────────────┘    │ Model:       │
                                        │ Claude 3.5   │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Generate     │
                                        │ Image        │
                                        │              │
                                        │ "Hero image  │
                                        │ for blog     │
                                        │ about..."    │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────────────────────────────┐
                                        │ Human-in-the-Loop                    │
                                        │                                      │
                                        │ Notify: #content-team via Slack      │
                                        │                                      │
                                        │ Show: Article + Image                │
                                        │                                      │
                                        │ Actions: [Publish] [Edit] [Reject]   │
                                        │                                      │
                                        │ Timeout: 48 hours → Auto-reject      │
                                        └──────────────────────────────────────┘
                                                          │
                                               ┌──────────┼──────────┐
                                               ▼          ▼          ▼
                                           Publish      Edit      Reject
                                               │          │          │
                                               ▼          ▼          ▼
                                        ┌──────────┐ Loop back  ┌──────────┐
                                        │ Notion   │ to Ask AI  │ Slack    │
                                        │ Create   │ with       │ Notify   │
                                        │ Page     │ feedback   │ author   │
                                        └──────────┘            └──────────┘

**Impact**: Marketing generates drafts automatically, humans maintain quality control
```

---

### Example 4: Intelligent Data Sync Pipeline

**Business Need**: Sync new customers from Stripe to CRM with AI-enriched company data, automatic segmentation, and team notifications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Intelligent Data Sync Pipeline                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───▶│ Transform    │───▶│ Run Agent    │
│              │    │              │    │              │
│ Stripe       │    │ Extract:     │    │ "Company     │
│ customer.    │    │ - email      │    │ Enrichment"  │
│ created      │    │ - name       │    │              │
│              │    │ - metadata   │    │ Tools:       │
└──────────────┘    └──────────────┘    │ - LinkedIn   │
                                        │ - Clearbit   │
                                        │ - Web search │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Categorizer  │
                                        │              │
                                        │ Segments:    │
                                        │ - Enterprise │
                                        │ - Mid-market │
                                        │ - SMB        │
                                        │ - Startup    │
                                        │              │
                                        │ Based on:    │
                                        │ - Company    │
                                        │   size       │
                                        │ - Industry   │
                                        │ - Plan       │
                                        └──────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         Enterprise       Mid-market         SMB/Startup
                              │                │                │
                              ▼                ▼                ▼
                       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                       │ HubSpot      │ │ HubSpot      │ │ HubSpot      │
                       │ Create       │ │ Create       │ │ Create       │
                       │              │ │              │ │              │
                       │ Owner:       │ │ Owner:       │ │ Owner:       │
                       │ Enterprise   │ │ Growth team  │ │ Self-serve   │
                       │ AE           │ │              │ │ queue        │
                       └──────────────┘ └──────────────┘ └──────────────┘
                              │                │                │
                              ▼                ▼                ▼
                       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                       │ Slack        │ │ Slack        │ │ Gmail        │
                       │ #enterprise  │ │ #growth      │ │              │
                       │              │ │              │ │ Welcome      │
                       │ "🎯 New      │ │ "New mid-    │ │ sequence     │
                       │ enterprise   │ │ market..."   │ │ trigger      │
                       │ lead..."     │ │              │ │              │
                       └──────────────┘ └──────────────┘ └──────────────┘

**Impact**: Every new customer auto-routed with enriched data, zero manual triage
```

---

### Example 5: Multi-Stage Approval Workflow

**Business Need**: Large purchase orders require multiple approvals with automatic escalation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Purchase Order Approval                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───▶│ Router       │───▶│ Based on     │
│              │    │              │    │ amount       │
│ New PO from  │    │ amount > ?   │    └──────────────┘
│ procurement  │    └──────────────┘          │
│ system       │                        ┌─────┼─────────────┐
└──────────────┘                        ▼     ▼             ▼
                                    < $1K  $1K-$10K      > $10K
                                        │     │             │
                                        ▼     ▼             ▼
                                    Auto   Manager       Manager
                                  approve  approval      approval
                                        │     │             │
                                        │     │             ▼
                                        │     │     ┌──────────────┐
                                        │     │     │ Approval     │
                                        │     │     │ Gate         │
                                        │     │     │              │
                                        │     │     │ VP Finance   │
                                        │     │     │              │
                                        │     │     │ Timeout: 24h │
                                        │     │     │ Escalate: CFO│
                                        │     │     └──────────────┘
                                        │     │             │
                                        │     ▼             │
                                        │ ┌──────────────┐  │
                                        │ │ Approval     │  │
                                        │ │ Gate         │  │
                                        │ │              │  │
                                        │ │ Department   │  │
                                        │ │ Manager      │  │
                                        │ │              │  │
                                        │ │ Timeout: 48h │  │
                                        │ │ Escalate: VP │  │
                                        │ └──────────────┘  │
                                        │       │           │
                                        ▼       ▼           ▼
                                        ┌───────────────────┐
                                        │ Audit Log         │
                                        │                   │
                                        │ Record:           │
                                        │ - PO details      │
                                        │ - Approvers       │
                                        │ - Timestamps      │
                                        │ - Decisions       │
                                        │                   │
                                        │ Destination:      │
                                        │ - Database        │
                                        │ - S3 (compliance) │
                                        └───────────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │ NetSuite     │
                                        │ Create PO    │
                                        │              │
                                        │ With audit   │
                                        │ trail        │
                                        └──────────────┘

**Impact**: SOC2-compliant approval process with automatic escalation and full audit trail
```

---

### Example 6: Document Processing Pipeline

**Business Need**: Process incoming contracts, extract key terms, add to knowledge base, alert legal team.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Contract Processing Pipeline                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ On New Email │───▶│ Parse PDF    │───▶│ Extract Data │
│              │    │              │    │              │
│ From:        │    │ OCR: on      │    │ Fields:      │
│ *@legal.com  │    │ Tables: on   │    │ - parties    │
│              │    │              │    │ - value      │
│ Has:         │    │              │    │ - term       │
│ attachment   │    │              │    │ - start_date │
└──────────────┘    └──────────────┘    │ - clauses[]  │
                                        │ - risks[]    │
                                        └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Scorer       │
                                        │              │
                                        │ Risk score   │
                                        │ based on:    │
                                        │ - Unusual    │
                                        │   clauses    │
                                        │ - Missing    │
                                        │   protections│
                                        │ - Value/risk │
                                        │   ratio      │
                                        └──────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                         Low risk         Medium risk      High risk
                              │                │                │
                              ▼                ▼                ▼
                       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                       │ Add to KB    │ │ Add to KB    │ │ Add to KB    │
                       │              │ │              │ │              │
                       │ Auto-index   │ │ Flag for     │ │ Flag urgent  │
                       │              │ │ review       │ │              │
                       └──────────────┘ └──────────────┘ └──────────────┘
                              │                │                │
                              ▼                ▼                ▼
                       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                       │ Airtable     │ │ Slack        │ │ Human-in-    │
                       │ Create       │ │ #legal       │ │ the-Loop     │
                       │ Record       │ │              │ │              │
                       │              │ │ "Medium risk │ │ Urgent       │
                       │ Contract     │ │ contract..." │ │ legal review │
                       │ database     │ └──────────────┘ │ required     │
                       └──────────────┘                  └──────────────┘

**Impact**: Legal team focuses on high-risk contracts, routine contracts auto-processed
```

---

### Example Workflows Index

These workflows are documented in detail in their respective phase spec files with specific acceptance criteria:

| Example                                 | Primary Nodes Used                              | Spec Location                 |
| --------------------------------------- | ----------------------------------------------- | ----------------------------- |
| **Customer Support Automation**         | Categorizer, KB Chat, Agent Chat, PII Redactor  | Phase 05-09 (AI Nodes)        |
| **Lead Enrichment & Qualification**     | Run Agent, Scorer, Router, HubSpot              | Phase 05-09 (AI Nodes)        |
| **Content Review Pipeline**             | Ask AI, Generate Image, Human-in-the-Loop       | Phase 05-09 (AI Nodes)        |
| **Intelligent Data Sync Pipeline**      | Webhook, Run Agent, Categorizer, HubSpot, Slack | Phase 10-12 (Automation)      |
| **Multi-Stage Purchase Order Approval** | Approval Gate, Audit Log, Router                | Phase 15-16 (Governance)      |
| **Document Processing Pipeline**        | Parse PDF, Extract Data, Scorer, Add to KB      | Phase 13-14 (Knowledge)       |
| **Company Enrichment Custom Node**      | HTTP Request, Transform, Ask AI                 | Phase 20-21 (Custom/Subflows) |
| **Manager Approval Subflow**            | Approval Gate, Transform, Slack                 | Phase 20-21 (Custom/Subflows) |

---

## Implementation Phases

21 phases organized by capability area. Each phase spec in `./phases/` includes:

- Node definitions with TypeScript interfaces
- Backend executor implementations
- Frontend component patterns (using existing right-panel config and left sidebar)
- Test workflows for validation

**Note**: This spec focuses purely on node functionality. The existing UI patterns are preserved:

- Right panel for node configuration (NodeInspector)
- Left sidebar for node library (NodeLibrary)

### Phase Overview

| Group            | Phases | What It Covers                                                          |
| ---------------- | ------ | ----------------------------------------------------------------------- |
| **Foundation**   | 01     | Node registry, category types, shared type definitions                  |
| **Core Tools**   | 02-04  | Router, Loop, Delay, Transform, Code, file parsers (PDF, CSV, Excel)    |
| **AI**           | 05-09  | Ask AI, Extract Data, Categorizer, Summarizer, vision nodes, Run Agent  |
| **Automation**   | 10-12  | Schedule, Webhook, Email/Drive/Sheets triggers, Notion/Airtable readers |
| **Knowledge**    | 13-14  | Search KB, Add to KB, KB Chat, source sync, analytics                   |
| **Governance**   | 15-16  | Approval Gate, Audit Log, PII Redactor, Rate Limiter, Circuit Breaker   |
| **Integrations** | 17-19  | IntegrationNode framework, provider operations (Slack, Gmail, HubSpot)  |
| **Custom**       | 20-21  | Custom node builder, subflow composition                                |

### Phase Dependencies

```
01 (Types, Registry)
 │
 ├─────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                 │
 ▼                                                                                 ▼
02-04 (Core Tools) ─────────────────────────┬───────────────────── 10-12 (Automation)
 │                                          │                                      │
 │                                          ▼                                      │
 │                                    05-09 (AI)                                   │
 │                                          │                                      │
 │                                          ▼                                      │
 │                                    13-14 (Knowledge)                            │
 │                                          │                                      │
 └──────────────────────────────────────────┼──────────────────────────────────────┘
                                            │
                                            ▼
                                      15-16 (Governance)
                                            │
                                            ▼
                                      17-19 (Integrations)
                                            │
                                            ▼
                                      20-21 (Custom/Subflows)
```

### Verification Checkpoints

| After Phase | Milestone    | What Works                       |
| ----------- | ------------ | -------------------------------- |
| 04          | Core Tools   | Basic data processing workflows  |
| 09          | AI Complete  | AI-powered workflows             |
| 12          | Automation   | External event triggers          |
| 14          | Knowledge    | RAG and knowledge base workflows |
| 16          | Governance   | Compliance and security features |
| 19          | Integrations | Third-party connections          |
| 21          | Complete     | Full system with custom nodes    |

See the `/phases` directory for detailed implementation specs.

---

## Success Metrics

After implementation, we expect:

| Metric                       | Before           | After               |
| ---------------------------- | ---------------- | ------------------- |
| Time to first workflow       | 30+ minutes      | 5 minutes           |
| Nodes used per workflow      | 3-5 (primitives) | 3-5 (purpose-built) |
| Support tickets for "how to" | High             | Low                 |
| User-created workflows       | Power users only | All users           |
| Workflow complexity possible | Limited          | Enterprise-grade    |

---

## Migration Path

Existing workflows using primitive nodes will continue to work. The old nodes remain available under "Advanced" or can be deprecated over time as purpose-built alternatives prove stable.

---

## Getting Started

1. Review the phase dependency graph above to understand parallel work opportunities
2. Read phase specs in `./phases/` starting with `phase-01-*.md` (Foundation) then `phase-02-*.md` through `phase-04-*.md` (Core Tools)
3. Each phase should have its own PR for easier review

---

## Testing Guidelines

Each phase spec includes a `## Unit Tests` section specifying test files and cases. Follow these patterns:

### Test Patterns

| Pattern               | Applies To                             | Approach                                    |
| --------------------- | -------------------------------------- | ------------------------------------------- |
| **A (Pure Logic)**    | Router, Transform, Filter, Loop        | Test executor directly, no mocking          |
| **B (Mock LLM)**      | Categorizer, Sentiment, Scorer, Ask AI | Mock `executeLLMNode` with canned responses |
| **C (Mock Services)** | HTTP Request, Integrations, Readers    | Use `nock` to mock external APIs            |
| **D (Mock Redis)**    | Rate Limiter, Circuit Breaker          | Mock Redis client for state                 |

### Mock Utilities

```typescript
// MockContext - Create test execution context
import { createMockContext } from "../helpers/MockContext";
const context = createMockContext({ variables: { data: { priority: "high" } } });

// MockLLMProvider - Deterministic LLM responses
import { MockLLMProvider } from "../helpers/MockLLMProvider";
const mockLLM = new MockLLMProvider();
mockLLM.setJSONResponse("classification", { category: "billing", confidence: 0.95 });
jest.spyOn(llmExecutor, "executeLLMNode").mockImplementation(mockLLM.getMockExecutor());

// MockRedis - State management testing
import { MockRedis } from "../mocks/redis.mock";
const mockRedis = new MockRedis();
jest.spyOn(redisModule, "getRedisClient").mockReturnValue(mockRedis);
```

### Directory Structure

```
backend/tests/
├── unit/node-executors/
│   ├── flow-control/      # Router, Loop, Wait
│   ├── data-processing/   # Transform, Filter, Aggregate
│   ├── ai/                # Categorizer, Sentiment, Scorer
│   ├── knowledge/         # KB Search, KB Add
│   └── governance/        # Rate Limiter, PII Redactor
├── integration/workflows/  # One test per phase group
├── mocks/                  # MockRedis, etc.
└── helpers/               # MockContext, MockLLMProvider
```

### Running Tests

```bash
npm run test --workspace=backend          # All tests
npm run test:unit --workspace=backend     # Unit only
npm run test:integration --workspace=backend  # Integration only
```

---

## Related Documents

- [Phase Specifications](./phases/) - Detailed implementation specs for all 21 phases
