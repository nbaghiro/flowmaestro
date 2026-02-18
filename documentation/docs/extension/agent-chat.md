---
sidebar_position: 4
title: Agent Chat
---

# Chatting with Agents

The FlowMaestro extension lets you chat with your AI agents while including context from the current webpage. Ask questions about the page, get help with tasks, or have conversations enhanced by real-time web context.

## Starting a Chat

1. Click the FlowMaestro extension icon
2. Select the **Agents** tab
3. Choose an agent from the dropdown
4. Start typing

<!-- Screenshot: Agent selection dropdown -->

## Selecting an Agent

Your agents are organized by recency and purpose:

```
Recent Agents
├── Research Assistant
└── Writing Helper

All Agents
├── Customer Support Bot
├── Code Review Assistant
├── Content Analyzer
└── General Assistant
```

Each agent shows:

- Name and avatar
- Brief description
- Available tools

## Page Context

### Including Page Context

Toggle context options above the input:

| Toggle         | Effect                            |
| -------------- | --------------------------------- |
| **Page Text**  | Include visible text and metadata |
| **Screenshot** | Include viewport screenshot       |

When enabled, context is automatically included with your message.

### How Context is Used

Your message is enhanced with page data:

```
You: Summarize the key points of this article

[System adds context]
---
Page Context:
URL: https://blog.example.com/productivity-tips
Title: 10 Productivity Tips for Remote Workers
Content: [Full article text...]
Metadata:
  - Author: Jane Smith
  - Published: January 15, 2024
  - Keywords: productivity, remote work, tips
```

The agent can then:

- Reference specific page content
- Answer questions about the page
- Perform analysis based on the content
- Generate related content

### Using Selected Text

For focused context:

1. Highlight text on the page
2. Toggle "Page Text" on
3. Send your message

Only your selected text is included, perfect for:

- Asking about specific paragraphs
- Analyzing particular data
- Getting explanations for specific content

## Conversation Features

### Streaming Responses

Responses stream in real-time, token by token:

<!-- Screenshot: Streaming response in progress -->

### Markdown Rendering

Agent responses render markdown:

- **Bold** and _italic_ text
- Code blocks with syntax highlighting
- Lists and tables
- Links and images

### Message History

Your conversation persists within the session:

- Scroll up to see previous messages
- Context is maintained across messages
- Clear history with the **Clear Chat** button

### Thread Continuity

Conversations are saved as threads:

- Return to the same agent later
- Continue where you left off
- Threads sync with the main FlowMaestro app

## Tool Usage

Agents can use their configured tools during chat:

### Tool Indicators

When an agent uses a tool, you'll see:

```
Agent is using: Search Knowledge Base...
```

### Common Tools in Extension

| Tool               | Use Case                    |
| ------------------ | --------------------------- |
| **Web Search**     | Find additional information |
| **Knowledge Base** | Search your saved content   |
| **Workflows**      | Run automations             |
| **Integrations**   | Access connected services   |

### Tool Results

Tool outputs appear inline:

```
Agent: I searched our knowledge base for related information.

[Knowledge Base Results]
Found 3 relevant documents:
1. Product FAQ - 92% match
2. Pricing Guide - 87% match
3. Feature Comparison - 81% match

Based on this, here's what I found about your question...
```

## Use Cases

### Page Analysis

```
You: What's the main argument of this article?

Agent: The article argues that remote work productivity depends
on three key factors:
1. Structured daily routines
2. Clear communication protocols
3. Dedicated workspace setup

The author supports this with data from a 2023 survey of
2,500 remote workers...
```

### Research Assistance

```
You: [On a competitor's pricing page]
How does their pricing compare to ours?

Agent: Based on the pricing page I can see:

Their Pro plan ($29/month) vs Our Pro plan ($25/month):
- They offer 20 users, we offer 25 users
- They have 100GB storage, we have unlimited
- Both include API access

Key advantage: Our plan is 14% cheaper with better limits...
```

### Content Creation

```
You: [On a news article]
Write a LinkedIn post about this story

Agent: Here's a LinkedIn post based on the article:

---
🚀 Big news in the AI industry!

[Company] just announced a breakthrough in... [continues with
content based on the article]

What do you think about this development? Drop a comment below!

#AI #Technology #Innovation
---
```

### Quick Translation

```
You: [On a page in Spanish]
What does this page say?

Agent: This is a product announcement page. Key points:
- New feature launch on March 1st
- 30% discount for existing customers
- Integration with major CRM platforms...
```

## Chat Settings

### Clear Conversation

Click **Clear Chat** to:

- Remove message history
- Start fresh conversation
- Create new thread

### Change Agent

Select a different agent from the dropdown. Your current conversation ends, and a new one begins with the selected agent.

## Best Practices

### Be Specific

```
Good: "What are the 3 main pricing tiers mentioned on this page?"
Poor: "Tell me about pricing"
```

### Use Selection for Focus

```
[Select a specific paragraph]
You: Explain this section in simpler terms
```

### Leverage Tools

If your agent has tools, ask it to use them:

```
You: Search our knowledge base for related policies
You: Run the data extraction workflow on this page
```

### Multi-turn Conversations

Build on previous messages:

```
You: Summarize this article
Agent: [Provides summary]

You: What sources did they cite?
Agent: [Lists sources from the same article]

You: Is there anything contradictory to our internal data?
Agent: [Compares with knowledge base]
```

## Troubleshooting

### Agent Not Responding

1. Check your internet connection
2. Verify you're authenticated
3. Try selecting a different agent
4. Refresh the extension

### Context Not Included

1. Ensure toggles are enabled
2. Check if the page is extractable
3. Wait for dynamic content to load
4. Try selecting specific text

### Slow Responses

1. Disable screenshot for text-only questions
2. Use selected text instead of full page
3. Check if agent has many tools (tool loading)

### Messages Not Saving

1. Verify authentication status
2. Check workspace connection
3. Clear cache and re-authenticate

## Privacy Notes

- Conversations are stored in your FlowMaestro workspace
- Page context is processed securely
- You control what context is shared per message
- Agent interactions follow your workspace's data policies
