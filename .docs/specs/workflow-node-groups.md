# FlowMaestro Workflow Node Groups Specification

## Overview

FlowMaestro organizes workflow nodes into purpose-built categories designed for non-technical users. Each node serves a specific business function rather than exposing low-level primitives.

---

## Node Categories

| Category          | Description                         | Node Count   |
| ----------------- | ----------------------------------- | ------------ |
| **AI & Agents**   | AI models, agents, and intelligence | 18           |
| **Knowledge**     | RAG, search, and knowledge bases    | 5            |
| **Automations**   | Triggers and scheduled workflows    | 12           |
| **Tools**         | Data processing and utilities       | 35           |
| **Voice & Calls** | Telephony and voice automation      | 10           |
| **Integrations**  | Third-party service connections     | ~80          |
| **Custom Nodes**  | User-created reusable nodes         | User-defined |
| **Subflows**      | Composable workflow components      | User-defined |

---

## Category 1: AI & Agents

### Using AI Nodes

#### Ask AI

Prompt any AI model (OpenAI, Claude, Gemini) with full control over system prompts and conversation context.

**Example: Product Description Generator**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Sheets      │───▶│ Ask AI       │───▶│ Sheets      │
│ Reader      │    │              │    │ Writer      │
│ (products)  │    │ "Write a     │    │ (add desc)  │
└─────────────┘    │ compelling   │    └─────────────┘
                   │ 50-word      │
                   │ description  │
                   │ for this     │
                   │ product..."  │
                   └──────────────┘
```

**Use case**: E-commerce team generates SEO-friendly descriptions for 500 products overnight.

---

#### Extract Data

Pull structured information from unstructured text. Define the fields you want and get clean JSON output.

**Example: Resume Parser**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Gmail       │───▶│ Extract Data │───▶│ Airtable    │
│ Reader      │    │              │    │ Writer      │
│ (job apps)  │    │ Fields:      │    │ (candidates)│
└─────────────┘    │ - name       │    └─────────────┘
                   │ - email      │
                   │ - years_exp  │
                   │ - skills[]   │
                   │ - education  │
                   └──────────────┘

Output:
{
  "name": "Jane Smith",
  "email": "jane@email.com",
  "years_exp": 5,
  "skills": ["Python", "React", "AWS"],
  "education": "BS Computer Science, MIT"
}
```

**Use case**: HR team automatically parses incoming resumes into structured candidate records.

---

#### Categorizer

Classify content into custom categories using natural language descriptions.

**Example: Support Ticket Routing**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Zendesk     │───▶│ Categorizer  │───▶│ Router      │
│ Reader      │    │              │    │             │
└─────────────┘    │ Categories:  │    └─────────────┘
                   │ - Billing:   │          │
                   │   "Payment,  │    ┌─────┼─────┐
                   │   invoice,   │    ▼     ▼     ▼
                   │   refund"    │  Billing Tech  Sales
                   │ - Technical: │    │     │     │
                   │   "Bug, error│    ▼     ▼     ▼
                   │   not working│  Route  Route Route
                   │ - Sales:     │  to     to    to
                   │   "Pricing,  │  team   team  team
                   │   demo, buy" │
                   └──────────────┘
```

**Use case**: Auto-route 1000+ daily support tickets to the right team without manual triage.

---

#### Summarizer

Condense long content into key points with configurable length and focus areas.

**Example: Meeting Notes Digest**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Google      │───▶│ Summarizer   │───▶│ Slack       │
│ Drive       │    │              │    │ #team       │
│ (meeting    │    │ Length: 3    │    └─────────────┘
│  transcript)│    │ bullets      │
└─────────────┘    │              │
                   │ Focus:       │
                   │ - Decisions  │
                   │ - Action     │
                   │   items      │
                   │ - Deadlines  │
                   └──────────────┘

Output:
"📋 Meeting Summary:
• Decided to launch beta on March 15
• @john to finalize API docs by Friday
• Budget approved for 2 additional engineers"
```

**Use case**: Automatically post meeting summaries to Slack after every recorded call.

---

#### Translator

Translate text between 50+ languages while preserving formatting and context.

**Example: Multi-Language Customer Support**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│ Intercom    │───▶│ Translator   │───▶│ Ask AI       │───▶│ Translator  │
│ Message     │    │              │    │ (respond)    │    │             │
│ (Spanish)   │    │ ES → EN      │    │              │    │ EN → ES     │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │ Intercom    │
                                                          │ Reply       │
                                                          └─────────────┘
```

**Use case**: Support team responds to customers in their native language automatically.

---

#### Sentiment Analyzer

Detect emotional tone, intent, and key phrases from text.

**Example: Review Monitoring Dashboard**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ HTTP        │───▶│ Sentiment    │───▶│ Router      │
│ Request     │    │ Analyzer     │    │             │
│ (app store  │    │              │    └─────────────┘
│  reviews)   │    │ Output:      │          │
└─────────────┘    │ - score: 0.2 │    ┌─────┴─────┐
                   │ - label:     │    ▼           ▼
                   │   "negative" │ Negative   Positive
                   │ - phrases:   │    │           │
                   │   ["crashes",│    ▼           ▼
                   │    "slow"]   │  Slack      Thank
                   └──────────────┘  #urgent    customer
```

**Use case**: Product team gets instant Slack alerts for negative app reviews.

---

#### Scorer

Rate content 0-100 based on custom criteria. Great for lead scoring and prioritization.

**Example: Lead Qualification Score**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ HubSpot     │───▶│ Scorer       │───▶│ HubSpot     │
│ Reader      │    │              │    │ Update      │
│ (new leads) │    │ Criteria:    │    │ (set score) │
└─────────────┘    │ "Score based │    └─────────────┘
                   │ on: company  │
                   │ size (>100   │
                   │ employees),  │
                   │ industry fit │
                   │ (SaaS/tech), │
                   │ job title    │
                   │ (VP+), and   │
                   │ message      │
                   │ intent"      │
                   │              │
                   │ Output: 85   │
                   └──────────────┘
```

**Use case**: Sales team focuses on high-score leads first, improving conversion rates.

---

#### AI List Sorter

Intelligently reorder items by semantic relevance to criteria.

**Example: Prioritize Feature Requests**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Notion      │───▶│ AI List      │───▶│ Notion      │
│ Reader      │    │ Sorter       │    │ Update      │
│ (feature    │    │              │    │ (reorder)   │
│  requests)  │    │ Criteria:    │    └─────────────┘
└─────────────┘    │ "Sort by     │
                   │ potential    │
                   │ revenue      │
                   │ impact and   │
                   │ ease of      │
                   │ implementation"
                   └──────────────┘
```

**Use case**: Product manager auto-prioritizes backlog based on business impact.

---

### Vision & Media Nodes

#### Generate Image

Create images with DALL-E or Stable Diffusion using natural language descriptions.

**Example: Social Media Asset Generator**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Schedule    │───▶│ Generate     │───▶│ Buffer      │
│ (daily)     │    │ Image        │    │ (schedule   │
└─────────────┘    │              │    │  post)      │
                   │ Prompt:      │    └─────────────┘
                   │ "Minimalist  │
                   │ illustration │
                   │ of {{topic}} │
                   │ in brand     │
                   │ colors blue  │
                   │ and white"   │
                   └──────────────┘
```

**Use case**: Marketing creates unique images for daily social posts without a designer.

---

#### Analyze Image

Extract text, objects, and meaning from images using AI vision.

**Example: Receipt Expense Tracker**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Gmail       │───▶│ Analyze      │───▶│ QuickBooks  │
│ Reader      │    │ Image        │    │ Create      │
│ (receipts)  │    │              │    │ Expense     │
└─────────────┘    │ "Extract:    │    └─────────────┘
                   │ - vendor     │
                   │ - amount     │
                   │ - date       │
                   │ - category"  │
                   │              │
                   │ Output:      │
                   │ vendor:      │
                   │  "Staples"   │
                   │ amount: 45.99│
                   │ category:    │
                   │  "Supplies"  │
                   └──────────────┘
```

**Use case**: Employees forward receipt photos, expenses auto-logged to accounting.

---

#### Analyze Video

Process video content with AI vision to extract key frames and descriptions.

**Example: Video Content Moderator**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Analyze      │───▶│ Router      │
│ (new video  │    │ Video        │    │             │
│  upload)    │    │              │    └─────────────┘
└─────────────┘    │ "Flag any    │          │
                   │ inappropriate│    ┌─────┴─────┐
                   │ content,     │    ▼           ▼
                   │ violence, or │  Clean     Flagged
                   │ policy       │    │           │
                   │ violations"  │    ▼           ▼
                   └──────────────┘  Auto-      Human
                                    publish    review
```

**Use case**: UGC platform auto-screens uploads before publishing.

---

### AI Agent Nodes

#### Run Agent

Execute a pre-built agent as a single step in a workflow. The agent uses its tools and knowledge to complete a task.

**Example: Intelligent Data Enrichment**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Run Agent    │───▶│ Salesforce  │
│ (new signup)│    │              │    │ Create Lead │
└─────────────┘    │ Agent:       │    └─────────────┘
                   │ "Company     │
                   │  Researcher" │
                   │              │
                   │ Tools:       │
                   │ - Web search │
                   │ - LinkedIn   │
                   │ - Clearbit   │
                   │              │
                   │ Task:        │
                   │ "Research    │
                   │ {{company}}  │
                   │ and return   │
                   │ size, funding│
                   │ industry"    │
                   └──────────────┘
```

**Use case**: New signups auto-enriched with company data before sales outreach.

---

#### Agent Chat

Multi-turn conversational agent within a workflow. Collects information through natural dialogue.

**Example: Customer Onboarding via Email**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Stripe      │───▶│ Agent Chat   │───▶│ Create      │
│ (new        │    │              │    │ Account     │
│  customer)  │    │ Agent:       │    │ (configured)│
└─────────────┘    │ "Onboarding" │    └─────────────┘
                   │              │
                   │ Channel:     │
                   │ Email        │
                   │              │
                   │ Collect:     │
                   │ - Team size  │
                   │ - Use case   │
                   │ - Timezone   │
                   │ - Preferences│
                   │              │
                   │ Exit when:   │
                   │ All collected│
                   └──────────────┘

Email conversation:
─────────────────────────────────────────────────────
Agent: "Welcome to FlowMaestro! I'm here to help set
        up your account. First, how large is your team?"

User:  "About 25 people"

Agent: "Great! And what's your main use case - marketing
        automation, sales workflows, or something else?"

User:  "Mainly sales workflows and lead management"

Agent: "Perfect. Last question - what timezone should
        we set for scheduled workflows?"
─────────────────────────────────────────────────────
```

**Use case**: New customers are onboarded via conversational email, no forms needed.

---

#### Agent Handoff

Transfer conversation between agents while preserving full context and history.

**Example: Tiered Support Escalation**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ Chat Widget │───▶│ Agent Chat   │───▶│ Router       │
│ (customer)  │    │ "L1 Support" │    │ (resolved?)  │
└─────────────┘    └──────────────┘    └──────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                               Resolved            Escalate
                                    │                   │
                                    ▼                   ▼
                              ┌──────────┐      ┌──────────────┐
                              │ Close    │      │ Agent        │
                              │ Ticket   │      │ Handoff      │
                              └──────────┘      │              │
                                                │ From: L1     │
                                                │ To: L2       │
                                                │              │
                                                │ Include:     │
                                                │ - Full convo │
                                                │ - Summary    │
                                                │ - Attempts   │
                                                └──────────────┘
                                                       │
                                                       ▼
                                                ┌──────────────┐
                                                │ Agent Chat   │
                                                │ "L2 Support" │
                                                │              │
                                                │ (Has full    │
                                                │  context)    │
                                                └──────────────┘
```

**Use case**: Complex issues escalate seamlessly without customer repeating themselves.

---

#### Human-in-the-Loop

Pause workflow execution for human approval, review, or input.

**Example: AI Content Review Pipeline**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────────────┐
│ Schedule    │───▶│ Ask AI       │───▶│ Human-in-the-Loop        │
│ (weekly)    │    │ (generate    │    │                          │
└─────────────┘    │  blog post)  │    │ Notify: #content-team    │
                   └──────────────┘    │ via Slack                │
                                       │                          │
                                       │ Show: Generated article  │
                                       │                          │
                                       │ Actions:                 │
                                       │ [Approve] [Edit] [Reject]│
                                       │                          │
                                       │ Timeout: 24 hours        │
                                       └──────────────────────────┘
                                                  │
                                       ┌──────────┼──────────┐
                                       ▼          ▼          ▼
                                   Approve     Edit      Reject
                                       │          │          │
                                       ▼          ▼          ▼
                                   Publish   Request    Notify
                                   to CMS    changes    author
```

**Use case**: AI-generated content requires human approval before publishing.

---

### Advanced AI Nodes

#### Compare Models

Run the same prompt across multiple AI models to compare quality, speed, and cost.

**Example: Model Selection for New Use Case**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Input       │───▶│ Compare      │───▶│ Output      │
│ (test       │    │ Models       │    │ (results)   │
│  prompts)   │    │              │    └─────────────┘
└─────────────┘    │ Models:      │
                   │ - GPT-4o     │
                   │ - Claude 3.5 │
                   │ - Gemini Pro │
                   │              │
                   │ Compare:     │
                   │ - Quality    │
                   │ - Latency    │
                   │ - Cost       │
                   └──────────────┘

Output:
┌────────────┬─────────┬─────────┬────────┐
│ Model      │ Quality │ Latency │ Cost   │
├────────────┼─────────┼─────────┼────────┤
│ GPT-4o     │ 92/100  │ 1.2s    │ $0.03  │
│ Claude 3.5 │ 95/100  │ 1.8s    │ $0.04  │
│ Gemini Pro │ 88/100  │ 0.9s    │ $0.02  │
└────────────┴─────────┴─────────┴────────┘
```

**Use case**: Team evaluates which model to use for a new feature before deployment.

---

#### Model Router

Automatically select the best model for each task based on complexity, cost, and speed requirements.

**Example: Cost-Optimized AI Pipeline**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Input       │───▶│ Model Router │───▶│ Next Step   │
│ (request)   │    │              │    │             │
└─────────────┘    │ Rules:       │    └─────────────┘
                   │ - Simple Q&A │
                   │   → GPT-4o-  │
                   │     mini     │
                   │ - Complex    │
                   │   reasoning  │
                   │   → Claude   │
                   │ - Code gen   │
                   │   → GPT-4o   │
                   └──────────────┘
```

**Use case**: Reduce AI costs by 60% by routing simple tasks to cheaper models.

---

## Category 2: Knowledge

#### Search Knowledge Base

Semantic search across your documents with relevance scoring and source citations.

**Example: Sales Battlecard Lookup**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Slack       │───▶│ Search       │───▶│ Slack       │
│ Message     │    │ Knowledge    │    │ Reply       │
│ "@kb how do │    │ Base         │    │             │
│ we compare  │    │              │    └─────────────┘
│ to Competitor│   │ KB: "Sales   │
│ X?"         │    │ Battlecards" │
└─────────────┘    │              │
                   │ Returns:     │
                   │ Top 3 chunks │
                   │ with sources │
                   └──────────────┘

Output:
"vs Competitor X:
✅ Our advantages: Better API, 24/7 support, lower TCO
❌ Their advantages: More integrations, brand recognition
💡 Key talking points: Focus on API flexibility...
[Source: Competitor-X-Battlecard.pdf, Page 2]"
```

**Use case**: Sales reps get instant competitive intel without leaving Slack.

---

#### Add to Knowledge Base

Ingest documents, URLs, or text into a knowledge base. Automatically chunks and embeds content.

**Example: Auto-Sync Product Documentation**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Schedule    │───▶│ Google Drive │───▶│ Add to      │
│ (nightly)   │    │ Reader       │    │ Knowledge   │
└─────────────┘    │ /Product-Docs│    │ Base        │
                   └──────────────┘    │             │
                                       │ KB: "Product│
                                       │ Documentation"
                                       │             │
                                       │ Options:    │
                                       │ - Replace   │
                                       │   existing  │
                                       │ - Chunk by  │
                                       │   heading   │
                                       └─────────────┘
```

**Use case**: Knowledge base always has latest docs without manual uploads.

---

#### Knowledge Base Chat

RAG-powered conversational Q&A grounded in your documents.

**Example: HR Policy Bot**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Slack       │───▶│ Knowledge    │───▶│ Slack       │
│ "@hr-bot    │    │ Base Chat    │    │ Reply       │
│ how many    │    │              │    │ (in thread) │
│ PTO days?"  │    │ KB: "HR      │    └─────────────┘
└─────────────┘    │ Policies"    │
                   │              │
                   │ Behavior:    │
                   │ - Answer from│
                   │   docs only  │
                   │ - Cite source│
                   │ - Say "I     │
                   │   don't know"│
                   │   if unsure  │
                   └──────────────┘

Output:
"Full-time employees receive 20 PTO days per year,
accrued at 1.67 days per month. You can carry over
up to 5 unused days to the next year.
[Source: PTO-Policy.pdf, Section 3.2]"
```

**Use case**: Employees get instant HR answers without waiting for email responses.

---

#### Sync Knowledge Source

Keep a knowledge base continuously updated from external sources.

**Example: Live Documentation Sync**

```
┌─────────────┐    ┌──────────────┐
│ Sync        │───▶│ Knowledge    │
│ Knowledge   │    │ Base         │
│ Source      │    │ "Help Docs"  │
│             │    └──────────────┘
│ Sources:    │
│ - Notion:   │
│   /Help-    │
│   Center    │
│ - GitHub:   │
│   /docs/*   │
│ - Website:  │
│   /blog/*   │
│             │
│ Frequency:  │
│ Every 6hr   │
└─────────────┘
```

**Use case**: Support bot always has answers from latest help docs, blog posts, and GitHub.

---

#### Knowledge Analytics

Track what's being searched, what's being found, and identify knowledge gaps.

**Example: Documentation Gap Analysis**

```
┌─────────────┐    ┌──────────────┐
│ Knowledge   │───▶│ Weekly       │
│ Analytics   │    │ Report       │
│             │    │ (email)      │
│ Report:     │    └──────────────┘
│ - Top       │
│   searches  │
│ - Zero-     │
│   result    │
│   queries   │
│ - Coverage  │
│   gaps      │
└─────────────┘

Output:
"📊 Knowledge Base Report:

Top Searches:
1. 'API rate limits' (142 searches)
2. 'SSO setup' (98 searches)
3. 'Webhook format' (76 searches)

❌ Knowledge Gaps (no good answer):
- 'bulk import' (34 searches, 12% relevance)
- 'white label' (28 searches, 8% relevance)

Recommendation: Create docs for bulk import and white labeling"
```

**Use case**: Documentation team knows exactly what content to create next.

---

## Category 3: Automations

### Triggers

#### Schedule

Run workflows on a cron schedule with timezone support.

**Example: Daily Standup Reminder**

```
┌─────────────┐    ┌──────────────┐
│ Schedule    │───▶│ Slack        │
│             │    │ Message      │
│ Cron:       │    │ #engineering │
│ 9:00 AM     │    └──────────────┘
│ Mon-Fri     │
│ TZ: PST     │
└─────────────┘

Message:
"🌅 Good morning team! Standup in 15 minutes.
Please post your updates:
• What you did yesterday
• What you're doing today
• Any blockers"
```

---

#### Webhook

Trigger workflows via HTTP POST from external systems.

**Example: Stripe Payment Processing**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Router       │───▶│ Actions     │
│             │    │ (event type) │    │             │
│ POST /stripe│    └──────────────┘    └─────────────┘
│             │           │
│ Validates:  │    ┌──────┼──────┐
│ - Signature │    ▼      ▼      ▼
│ - Headers   │ payment subscription invoice
│             │ success  created   failed
└─────────────┘    │      │      │
                   ▼      ▼      ▼
               Send    Setup   Alert
               receipt account finance
```

**Use case**: Automate all Stripe event handling in one workflow.

---

#### On New Email

Trigger when email arrives matching criteria.

**Example: Invoice Auto-Processing**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ On New      │───▶│ Parse PDF    │───▶│ QuickBooks  │
│ Email       │    │ (attachment) │    │ Create Bill │
│             │    └──────────────┘    └─────────────┘
│ Folder:     │
│ Invoices    │
│             │
│ From:       │
│ *@vendor.com│
│             │
│ Has:        │
│ attachment  │
└─────────────┘
```

**Use case**: Vendor invoices auto-entered into accounting system.

---

#### On New File

Trigger when file added to cloud storage.

**Example: Design Asset Processing**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ On New File │───▶│ Convert File │───▶│ Upload to   │
│             │    │              │    │ CDN         │
│ Folder:     │    │ Generate:    │    └─────────────┘
│ /Design/    │    │ - Thumbnail  │
│ Uploads     │    │ - WebP       │
│             │    │ - 2x size    │
│ Types:      │    └──────────────┘
│ .png, .jpg  │
└─────────────┘
```

**Use case**: Designers drop files, optimized versions auto-generated for web.

---

#### On New Row

Trigger when row added to spreadsheet or database.

**Example: Order Fulfillment**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ On New Row  │───▶│ ShipStation  │───▶│ Gmail       │
│             │    │ Create Order │    │ (confirm)   │
│ Sheet:      │    └──────────────┘    └─────────────┘
│ "Orders"    │
│             │
│ Filter:     │
│ status =    │
│ "paid"      │
└─────────────┘
```

**Use case**: Paid orders in spreadsheet automatically sent to fulfillment.

---

#### On New Message

Trigger on chat messages matching criteria.

**Example: Mention Alert System**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ On New      │───▶│ Sentiment    │───▶│ Router      │
│ Message     │    │ Analyzer     │    │             │
│             │    └──────────────┘    └─────────────┘
│ Channel:    │                              │
│ #feedback   │                        ┌─────┴─────┐
│             │                        ▼           ▼
│ Contains:   │                    Negative   Positive
│ @product    │                        │           │
│             │                        ▼           ▼
└─────────────┘                    Urgent     Log to
                                   Slack      Notion
```

**Use case**: Product mentions analyzed and routed based on sentiment.

---

### Readers

#### Gmail Reader

Fetch emails matching search criteria.

**Example: Weekly Newsletter Digest**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Schedule    │───▶│ Gmail Reader │───▶│ Summarizer  │
│ (Sunday 8pm)│    │              │    │             │
└─────────────┘    │ Query:       │    └─────────────┘
                   │ "category:   │          │
                   │  newsletters │          ▼
                   │  after:7d"   │    ┌─────────────┐
                   │              │    │ Notion      │
                   │ Limit: 50    │    │ Create Page │
                   └──────────────┘    │ "Weekly     │
                                       │  Reading"   │
                                       └─────────────┘
```

**Use case**: All newsletter content summarized into one weekly reading page.

---

#### Sheets Reader

Read rows from Google Sheets with filtering and column selection.

**Example: Inventory Alert System**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Schedule    │───▶│ Sheets       │───▶│ Filter      │
│ (hourly)    │    │ Reader       │    │ (stock < 10)│
└─────────────┘    │              │    └─────────────┘
                   │ Sheet:       │          │
                   │ "Inventory"  │          ▼
                   │              │    ┌─────────────┐
                   │ Columns:     │    │ Slack       │
                   │ - SKU        │    │ #inventory  │
                   │ - Name       │    │ "Low stock  │
                   │ - Stock      │    │  alert!"    │
                   └──────────────┘    └─────────────┘
```

**Use case**: Automatic alerts when inventory drops below threshold.

---

## Category 4: Tools

### Flow Control

#### Input

Define workflow entry point with typed parameters and validation.

**Example: API Endpoint with Validation**

```
┌─────────────────────────────────────────┐
│ Input                                   │
├─────────────────────────────────────────┤
│ Parameters:                             │
│                                         │
│ customer_id (string, required)          │
│   └─ Pattern: ^cust_[a-z0-9]+$          │
│                                         │
│ action (enum, required)                 │
│   └─ Options: create, update, delete    │
│                                         │
│ data (object, optional)                 │
│   └─ Schema: { name: string, ... }      │
└─────────────────────────────────────────┘
```

**Use case**: Webhook endpoint validates incoming data before processing.

---

#### Output

Return results from workflow in specified format.

**Example: API Response**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Process     │───▶│ Output       │───▶│ HTTP        │
│ Data        │    │              │    │ Response    │
└─────────────┘    │ Format:      │    └─────────────┘
                   │ {            │
                   │  "success":  │
                   │    true,     │
                   │  "data":     │
                   │    {{result}}│
                   │  "timestamp":│
                   │    {{now}}   │
                   │ }            │
                   └──────────────┘
```

---

#### Router

Branch workflow based on conditions with multiple paths.

**Example: Multi-Tier Pricing Logic**

```
┌─────────────┐    ┌──────────────┐
│ Input       │───▶│ Router       │
│ (order)     │    │              │
└─────────────┘    │ Conditions:  │
                   │              │
                   │ total > 1000 │───▶ VIP flow
                   │              │
                   │ total > 100  │───▶ Standard flow
                   │              │
                   │ default      │───▶ Basic flow
                   └──────────────┘
```

---

#### Loop

Iterate over a list and process each item.

**Example: Bulk Email Campaign**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Sheets      │───▶│ Loop         │───▶│ Gmail       │
│ Reader      │    │ (each row)   │    │ Send        │
│ (contacts)  │    │              │    │             │
└─────────────┘    │ For each:    │    │ To:         │
                   │ {{item}}     │    │ {{email}}   │
                   │              │    │             │
                   │ Parallel: 5  │    │ Subject:    │
                   │ Delay: 2s    │    │ "Hi {{name}}│
                   └──────────────┘    │ ..."        │
                                       └─────────────┘
```

**Use case**: Send personalized emails to 1000 contacts with rate limiting.

---

#### Wait

Pause workflow execution for a duration.

**Example: Follow-Up Sequence**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Send        │───▶│ Wait         │───▶│ Check       │───▶│ Send         │
│ Email #1    │    │ (3 days)     │    │ Opened?     │    │ Email #2     │
└─────────────┘    └──────────────┘    └─────────────┘    │ (if not      │
                                              │           │  opened)     │
                                              ▼           └──────────────┘
                                         Opened?
                                         Stop sequence
```

**Use case**: Automated follow-up emails with smart timing.

---

### Data Processing

#### Transform

Reshape data using templates and expressions.

**Example: Normalize API Response**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ HTTP        │───▶│ Transform    │───▶│ Database    │
│ Request     │    │              │    │ Insert      │
└─────────────┘    │ Template:    │    └─────────────┘
                   │ {            │
External API:      │  "id":       │
{                  │   "{{data.   │
  "data": {        │     user.id}}│
    "user": {      │  "name":     │
      "id": "123", │   "{{data.   │
      "firstName": │     user.    │
        "John",    │     firstName│
      "lastName":  │     }} {{... │
        "Doe"      │     lastName}│
    }              │     }}"      │
  }                │ }            │
}                  └──────────────┘
```

---

#### Filter

Keep only items matching conditions.

**Example: High-Value Order Filter**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Shopify     │───▶│ Filter       │───▶│ Slack       │
│ Reader      │    │              │    │ #vip-orders │
│ (orders)    │    │ Condition:   │    └─────────────┘
└─────────────┘    │ total > 500  │
                   │ AND          │
                   │ customer.    │
                   │ orders > 3   │
                   └──────────────┘
```

**Use case**: Alert sales team only for high-value repeat customers.

---

#### Aggregate

Calculate sums, counts, averages, and group data.

**Example: Daily Sales Summary**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Shopify     │───▶│ Aggregate    │───▶│ Slack       │
│ Reader      │    │              │    │ #sales      │
│ (today's    │    │ Operations:  │    └─────────────┘
│  orders)    │    │ - SUM(total) │
└─────────────┘    │ - COUNT(*)   │
                   │ - AVG(total) │
                   │              │
                   │ Group by:    │
                   │ - product    │
                   │ - region     │
                   └──────────────┘

Output:
"📊 Today's Sales: $12,450 (47 orders)
Avg order: $265

By Product:
• Widget Pro: $5,200 (22 orders)
• Widget Basic: $4,100 (18 orders)
• Accessories: $3,150 (7 orders)"
```

---

#### Deduplicate

Remove duplicate items based on key fields.

**Example: Lead Deduplication**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Multiple    │───▶│ Deduplicate  │───▶│ HubSpot     │
│ Sources     │    │              │    │ Create      │
│ (web, ads,  │    │ Key: email   │    │ Contact     │
│  events)    │    │              │    └─────────────┘
└─────────────┘    │ Keep: latest │
                   │              │
                   │ Merge:       │
                   │ - source[]   │
                   │ - utm_*      │
                   └──────────────┘
```

**Use case**: Leads from multiple sources merged without duplicates.

---

### File Processing

#### Parse PDF

Extract text and tables from PDF documents, including OCR for scanned files.

**Example: Contract Data Extraction**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Google      │───▶│ Parse PDF    │───▶│ Extract     │
│ Drive       │    │              │    │ Data        │
│ /Contracts  │    │ Options:     │    │             │
└─────────────┘    │ - OCR: on    │    │ Fields:     │
                   │ - Tables: on │    │ - parties   │
                   │ - Images: off│    │ - value     │
                   └──────────────┘    │ - term      │
                                       │ - clauses   │
                                       └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ Airtable    │
                                       │ "Contracts" │
                                       └─────────────┘
```

**Use case**: Legal team automatically catalogs all contracts with key terms.

---

#### Parse Document

Extract content from Word, Excel, PowerPoint while preserving structure.

**Example: RFP Response Automation**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Gmail       │───▶│ Parse        │───▶│ Search KB   │
│ (RFP        │    │ Document     │    │ (find       │
│  attached)  │    │              │    │  answers)   │
└─────────────┘    │ Extract:     │    └─────────────┘
                   │ - Questions  │          │
                   │ - Requirements          ▼
                   │ - Sections   │    ┌─────────────┐
                   └──────────────┘    │ Ask AI      │
                                       │ (draft      │
                                       │  response)  │
                                       └─────────────┘
```

**Use case**: Auto-draft RFP responses using knowledge base content.

---

### Enterprise Nodes

#### Approval Gate

Require human approval before workflow continues.

**Example: Expense Approval**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────────────┐
│ Webhook     │───▶│ Router       │───▶│ Approval Gate            │
│ (expense    │    │ (> $500?)    │    │                          │
│  submitted) │    └──────────────┘    │ Approver: manager        │
└─────────────┘           │            │ Notify via: Email        │
                          ▼            │                          │
                     Under $500        │ Show:                    │
                          │            │ - Amount: {{amount}}     │
                          ▼            │ - Category: {{category}} │
                     Auto-approve      │ - Receipt: {{image}}     │
                                       │                          │
                                       │ Timeout: 48 hours        │
                                       │ Escalate to: VP Finance  │
                                       └──────────────────────────┘
```

**Use case**: Expenses over $500 require manager approval with escalation.

---

#### Audit Log

Record actions for compliance and debugging.

**Example: Financial Transaction Logging**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Process     │───▶│ Audit Log    │───▶│ Continue    │
│ Payment     │    │              │    │ Flow        │
└─────────────┘    │ Record:      │    └─────────────┘
                   │ - action:    │
                   │   "payment_  │
                   │    processed"│
                   │ - amount:    │
                   │   {{amount}} │
                   │ - user:      │
                   │   {{user_id}}│
                   │ - ip:        │
                   │   {{ip}}     │
                   │ - timestamp  │
                   │              │
                   │ Destination: │
                   │ - Database   │
                   │ - S3 (backup)│
                   └──────────────┘
```

**Use case**: All financial transactions logged for SOC2 compliance.

---

#### PII Redactor

Automatically mask sensitive personal information.

**Example: Support Ticket Anonymization**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Zendesk     │───▶│ PII Redactor │───▶│ Ask AI      │
│ Reader      │    │              │    │ (analyze)   │
└─────────────┘    │ Detect:      │    └─────────────┘
                   │ - SSN        │
Input:             │ - Credit card│    Output to AI:
"My SSN is         │ - Phone      │    "My SSN is
123-45-6789        │ - Email      │    [REDACTED]
and card           │ - Name       │    and card
4532-1234-..."     │              │    [REDACTED]..."
                   │ Action:      │
                   │ Replace with │
                   │ [REDACTED]   │
                   └──────────────┘
```

**Use case**: Analyze support tickets without exposing customer PII to AI models.

---

#### Rate Limiter

Control execution frequency to prevent API overuse.

**Example: API Cost Control**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Loop        │───▶│ Rate Limiter │───▶│ OpenAI      │
│ (1000 items)│    │              │    │ API Call    │
└─────────────┘    │ Limits:      │    └─────────────┘
                   │ - 60/minute  │
                   │ - 1000/hour  │
                   │ - 10000/day  │
                   │              │
                   │ On limit:    │
                   │ Queue + wait │
                   │              │
                   │ Alert at:    │
                   │ 80% capacity │
                   └──────────────┘
```

**Use case**: Prevent runaway API costs by enforcing rate limits.

---

## Category 5: Voice & Calls

#### Answer Call

Handle incoming phone calls with greeting and routing.

**Example: Business Hours Router**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Answer Call │───▶│ Router       │───▶│ Actions     │
│             │    │ (business    │    │             │
│ Greeting:   │    │  hours?)     │    └─────────────┘
│ "Thanks for │    └──────────────┘          │
│ calling     │           │           ┌─────┴─────┐
│ Acme Corp"  │           ▼           ▼           ▼
└─────────────┘      9am-5pm      After hours
                          │           │
                          ▼           ▼
                    IVR Menu     Voicemail
```

**Use case**: Route calls differently based on time of day.

---

#### Make Call

Initiate outbound calls programmatically.

**Example: Appointment Reminder**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Schedule    │───▶│ Airtable     │───▶│ Loop        │
│ (daily 9am) │    │ Reader       │    │ (each appt) │
└─────────────┘    │ (tomorrow's  │    └─────────────┘
                   │  appointments)         │
                   └──────────────┘         ▼
                                     ┌─────────────┐
                                     │ Make Call   │
                                     │             │
                                     │ To: {{phone}}
                                     │ Caller ID:  │
                                     │ "Dr. Smith" │
                                     └─────────────┘
                                            │
                                            ▼
                                     ┌─────────────┐
                                     │ Voice Agent │
                                     │ (reminder   │
                                     │  script)    │
                                     └─────────────┘
```

**Use case**: Automated appointment reminders with natural conversation.

---

#### Voice Agent

AI-powered voice conversations with natural dialogue.

**Example: Order Status Hotline**

```
┌─────────────┐    ┌──────────────┐
│ Answer Call │───▶│ Voice Agent  │
└─────────────┘    │              │
                   │ Personality: │
                   │ "Friendly    │
                   │ customer     │
                   │ service rep" │
                   │              │
                   │ Tools:       │
                   │ - Look up    │
                   │   order      │
                   │ - Check      │
                   │   shipping   │
                   │ - Process    │
                   │   return     │
                   │              │
                   │ Knowledge:   │
                   │ - Return     │
                   │   policy     │
                   │ - FAQs       │
                   └──────────────┘

Conversation:
─────────────────────────────────────────────────────
Agent: "Hi, thanks for calling Acme! I can help you
        check order status or process returns. What
        can I help you with today?"

Caller: "Yeah, I need to check on order 12345"

Agent: [Looks up order]
       "I found your order. It shipped yesterday via
        FedEx and should arrive Thursday. Would you
        like me to text you the tracking number?"
─────────────────────────────────────────────────────
```

**Use case**: 24/7 order support without human agents.

---

#### IVR Menu

Present touch-tone or voice options to callers.

**Example: Department Routing**

```
┌─────────────┐    ┌──────────────┐
│ Answer Call │───▶│ IVR Menu     │
└─────────────┘    │              │
                   │ Prompt:      │
                   │ "Press 1 for │
                   │ Sales, 2 for │
                   │ Support, 3   │
                   │ for Billing" │
                   │              │
                   │ Input:       │
                   │ - DTMF (keys)│
                   │ - Voice      │
                   │              │
                   │ Timeout: 10s │
                   │ Retry: 2x    │
                   └──────────────┘
                          │
                   ┌──────┼──────┐
                   ▼      ▼      ▼
                   1      2      3
                   │      │      │
                   ▼      ▼      ▼
                Sales  Support Billing
                Queue  Queue   Queue
```

---

#### Transfer Call

Route call to another number, agent, or queue.

**Example: Escalation to Human**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Voice Agent │───▶│ Router       │───▶│ Transfer    │
│ (can't help)│    │ (escalate?)  │    │ Call        │
└─────────────┘    └──────────────┘    │             │
                                       │ Type: warm  │
                                       │ (announce)  │
                                       │             │
                                       │ To:         │
                                       │ Support     │
                                       │ Queue       │
                                       │             │
                                       │ Context:    │
                                       │ "Customer   │
                                       │ needs help  │
                                       │ with {{...}}│
                                       │ Tried: ..." │
                                       └─────────────┘
```

**Use case**: AI agent transfers to human with full context when needed.

---

#### Record Call

Capture call audio with automatic transcription.

**Example: Sales Call Recording**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Answer Call │───▶│ Record Call  │───▶│ Continue    │
└─────────────┘    │              │    │ Flow        │
                   │ Announce:    │    └─────────────┘
                   │ "This call   │
                   │ may be       │
                   │ recorded"    │    On call end:
                   │              │    ┌─────────────┐
                   │ Transcribe:  │───▶│ Summarizer  │
                   │ Yes          │    │             │
                   │              │    │ Extract:    │
                   │ Storage:     │    │ - Key points│
                   │ S3 bucket    │    │ - Actions   │
                   └──────────────┘    │ - Objections│
                                       └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ Salesforce  │
                                       │ Update Lead │
                                       └─────────────┘
```

**Use case**: All sales calls recorded, transcribed, and summarized to CRM.

---

## Category 6: Integrations

Integrations connect to third-party services via MCP (Model Context Protocol). Each integration provides consistent Read/Write/Search actions.

### Integration Categories

#### Communication

| Provider        | Actions                             |
| --------------- | ----------------------------------- |
| Gmail           | Read, Send, Search, Get Attachments |
| Outlook         | Read, Send, Calendar                |
| Slack           | Read, Send, Update, React           |
| Microsoft Teams | Read, Send, Channels                |
| Discord         | Read, Send, Manage                  |
| Twilio          | Send SMS, Make Call                 |

#### Productivity

| Provider        | Actions                      |
| --------------- | ---------------------------- |
| Google Sheets   | Read, Write, Update, Delete  |
| Google Drive    | List, Read, Upload, Share    |
| Google Calendar | List, Create, Update, Delete |
| Notion          | Query, Create, Update        |
| Airtable        | List, Create, Update, Delete |
| Coda            | Read, Write, Formulas        |

#### CRM & Sales

| Provider   | Actions                             |
| ---------- | ----------------------------------- |
| HubSpot    | Contacts, Companies, Deals, Tickets |
| Salesforce | Leads, Opportunities, Accounts      |
| Pipedrive  | Deals, Persons, Organizations       |
| Close      | Leads, Contacts, Activities         |

#### Support

| Provider  | Actions                         |
| --------- | ------------------------------- |
| Zendesk   | Tickets, Users, Organizations   |
| Intercom  | Conversations, Users, Companies |
| Freshdesk | Tickets, Contacts, Solutions    |

#### Project Management

| Provider   | Actions                   |
| ---------- | ------------------------- |
| Asana      | Tasks, Projects, Sections |
| Trello     | Cards, Lists, Boards      |
| Monday.com | Items, Boards, Updates    |
| Jira       | Issues, Projects, Sprints |
| Linear     | Issues, Projects, Cycles  |

#### Developer

| Provider  | Actions                     |
| --------- | --------------------------- |
| GitHub    | Issues, PRs, Repos, Actions |
| GitLab    | Issues, MRs, Pipelines      |
| Bitbucket | Repos, PRs, Pipelines       |

#### Database

| Provider   | Actions                       |
| ---------- | ----------------------------- |
| PostgreSQL | Query, Insert, Update, Delete |
| MySQL      | Query, Insert, Update, Delete |
| MongoDB    | Find, Insert, Update, Delete  |
| Supabase   | Query, RPC, Realtime          |
| Firebase   | Read, Write, Query            |

---

## Category 7: Custom Nodes

Users can create reusable custom nodes that encapsulate multiple steps.

**Example: Company Enrichment Custom Node**

Definition:

```
┌─────────────────────────────────────────────────────────────────┐
│ Custom Node: "Enrich Company"                                   │
├─────────────────────────────────────────────────────────────────┤
│ Input: domain (string)                                          │
│                                                                 │
│ Internal Flow:                                                  │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│ │ HTTP         │───▶│ HTTP         │───▶│ Ask AI       │       │
│ │ (Clearbit)   │    │ (LinkedIn)   │    │ (summarize)  │       │
│ └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                 │
│ Output: {                                                       │
│   name, industry, size, funding,                                │
│   technologies, summary                                         │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

Usage in workflow:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Enrich       │───▶│ Salesforce  │
│ (signup)    │    │ Company      │    │ Create Lead │
│             │    │ [Custom]     │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

---

## Category 8: Subflows

Subflows are complete workflows that can be called from other workflows.

**Example: Approval Subflow**

Definition:

```
┌─────────────────────────────────────────────────────────────────┐
│ Subflow: "Manager Approval"                                     │
├─────────────────────────────────────────────────────────────────┤
│ Inputs:                                                         │
│ - request_type: string                                          │
│ - requester: string                                             │
│ - details: object                                               │
│ - approver_email: string                                        │
│                                                                 │
│ Flow:                                                           │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│ │ Send         │───▶│ Approval     │───▶│ Notify       │       │
│ │ Request      │    │ Gate         │    │ Result       │       │
│ │ Email        │    │              │    │              │       │
│ └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                 │
│ Output: { approved: boolean, approver: string, timestamp }      │
└─────────────────────────────────────────────────────────────────┘
```

Usage - Expense workflow:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Manager      │───▶│ QuickBooks  │
│ (expense)   │    │ Approval     │    │ (if approved│
│             │    │ [Subflow]    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

Usage - PTO workflow:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Slack       │───▶│ Manager      │───▶│ BambooHR    │
│ /pto        │    │ Approval     │    │ (if approved│
│             │    │ [Subflow]    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

---

## Agent Builder vs Agent Nodes

FlowMaestro distinguishes between the **Agent Builder** (standalone) and **Agent Nodes** (in workflows):

| Aspect         | Agent Builder                      | Agent Nodes                           |
| -------------- | ---------------------------------- | ------------------------------------- |
| **Purpose**    | Create conversational AI agents    | Embed agent intelligence in pipelines |
| **Execution**  | Independent via chat/widget/API    | As workflow step when triggered       |
| **Control**    | Agent decides actions autonomously | Workflow controls when agent runs     |
| **Memory**     | Persistent across sessions         | Scoped to workflow execution          |
| **Deployment** | Website widget, Slack bot, API     | Part of automation workflow           |

### Agent Builder (Standalone)

Build agents with personality, tools, and knowledge that run independently:

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent: "Sales Assistant"                                        │
├─────────────────────────────────────────────────────────────────┤
│ Personality: Helpful sales rep for Acme Corp                    │
│                                                                 │
│ Tools: Search KB, Check Calendar, Book Meeting, Create Lead     │
│                                                                 │
│ Knowledge: Product Docs, Pricing Guide, FAQ                     │
│                                                                 │
│ Deploy: [Website Widget] [Slack Bot] [API]                      │
└─────────────────────────────────────────────────────────────────┘
```

Users chat with deployed agent. Agent autonomously decides which tools to use.

### Agent Nodes (In Workflows)

Use agents as steps in automated pipelines:

**Run Agent** - Single-turn execution:

```
Webhook → Run Agent "Lead Qualifier" → Router → CRM
```

**Agent Chat** - Multi-turn in workflow:

```
Stripe Event → Agent Chat "Onboarding" (via email) → Configure Account
```

**Agent Handoff** - Transfer between agents:

```
L1 Agent → Handoff (with context) → L2 Agent
```

Agents created in Agent Builder appear in the "Run Agent" node dropdown for use in workflows.

---

## UI Structure

### Main Menu

```
┌─────────────────────────────────────────┐
│ 🔍 Search nodes...                      │
├─────────────────────────────────────────┤
│ 🤖 AI & Agents                       →  │
│ 📚 Knowledge                         →  │
│ ⚡ Automations                        →  │
│ 🔧 Tools                             →  │
│ 📞 Voice & Calls                     →  │
│ 🧩 Your Custom Nodes                 →  │
│ 📦 Subflows                          →  │
├─────────────────────────────────────────┤
│ Frequently Used                         │
│ [Ask AI] [Input] [Extract Data]        │
│ [Output] [Categorizer] [Router]        │
├─────────────────────────────────────────┤
│ Integrations                            │
│ Gmail                            [MCP]→ │
│ Google Sheets                    [MCP]→ │
│ Slack                            [MCP]→ │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Category Drill-Down

Each category expands to show its nodes with descriptions:

```
← AI & Agents
🔍 Search all nodes...

💬 Ask AI
   Prompt any AI model with full control

📋 Extract Data
   Pull structured information from text

🏷️ Categorizer
   Classify content into custom categories
...
```

---

## Node Count Summary

| Category      | Count    |
| ------------- | -------- |
| AI & Agents   | 18       |
| Knowledge     | 5        |
| Automations   | 12       |
| Tools         | 35       |
| Voice & Calls | 10       |
| Integrations  | ~80      |
| **Total**     | **~160** |
