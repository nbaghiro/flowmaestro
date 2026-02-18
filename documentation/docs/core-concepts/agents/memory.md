---
sidebar_position: 4
title: Agent Memory
---

# Agent Memory

Memory enables agents to maintain context across conversations and remember important information. FlowMaestro supports three memory types optimized for different use cases.

## Memory Types

### Buffer Memory

The simplest memory type. Stores recent messages in order, providing full conversation context to the LLM.

```typescript
{
  type: "buffer",
  max_messages: 20  // Keep last 20 messages
}
```

**How it works:**

1. Each new message is added to the buffer
2. When `max_messages` is exceeded, oldest messages are removed
3. The entire buffer is included in LLM context

**Best for:**

- Short conversations
- Simple Q&A interactions
- When full message history is needed

**Considerations:**

- Token usage increases with more messages
- No summarization or compression
- Direct access to exact conversation history

### Summary Memory

Balances context retention with token efficiency by periodically summarizing older messages.

```typescript
{
  type: "summary",
  max_messages: 50,
  summary_interval: 10  // Summarize every 10 messages
}
```

**How it works:**

1. Recent messages (last N) are kept in full
2. Older messages are periodically summarized
3. Summary replaces detailed history
4. LLM receives summary + recent messages

**Best for:**

- Longer conversations
- Token-sensitive applications
- When general context matters more than exact wording

**Considerations:**

- Some detail is lost in summarization
- Better token efficiency
- Good balance of context and cost

### Vector Memory

Uses embeddings for semantic search over conversation history. Ideal for long-running agents.

```typescript
{
  type: "vector",
  max_messages: 100,
  vector_store_id: "vs_agent_memory"
}
```

**How it works:**

1. Each message is embedded as a vector
2. Vectors are stored in the vector database
3. On each turn, relevant past messages are retrieved
4. Semantically similar context is provided to LLM

**Best for:**

- Long-running agents
- Conversations spanning days/weeks
- When specific recall matters

**Considerations:**

- Requires vector store setup
- More complex retrieval
- Best for selective recall, not linear history

## Configuration

### In the Dashboard

1. Navigate to **Agents** > your agent
2. Click **Configuration**
3. Find the **Memory** section
4. Select memory type
5. Configure options

<!-- Screenshot: Memory configuration panel -->

### Memory Options

| Option             | Applies To | Description                |
| ------------------ | ---------- | -------------------------- |
| `max_messages`     | All        | Maximum messages to retain |
| `summary_interval` | Summary    | How often to summarize     |
| `vector_store_id`  | Vector     | Which vector store to use  |

## Built-in Memory Tools

Agents automatically have access to memory-related tools:

### search_thread_memory

Semantic search over the current conversation:

```json
{
    "tool": "search_thread_memory",
    "query": "What did the user say about their budget?",
    "top_k": 3
}
```

### update_working_memory

Store persistent facts for the agent:

```json
{
    "tool": "update_working_memory",
    "facts": {
        "user_name": "John",
        "project": "Website Redesign",
        "budget": 5000
    }
}
```

### Shared Memory Tools

Access workflow-level shared memory:

```json
// Read
{
  "tool": "read_shared_memory",
  "key": "customer_preferences"
}

// Write
{
  "tool": "write_shared_memory",
  "key": "conversation_summary",
  "value": "..."
}

// Semantic search
{
  "tool": "search_shared_memory",
  "query": "pricing information",
  "top_k": 5
}
```

## Working Memory

Beyond conversation history, agents have working memory for current session facts:

```typescript
workingMemory: {
  user_name: "John Smith",
  current_task: "Schedule meeting",
  preferences: {
    timezone: "America/New_York",
    communication: "email"
  }
}
```

Working memory is:

- Persistent within a thread
- Structured as key-value pairs
- Automatically included in context
- Updateable by the agent

## Memory Best Practices

### Choose the Right Type

| Scenario                      | Recommended Memory      |
| ----------------------------- | ----------------------- |
| Customer support chat         | Buffer (20-30 messages) |
| Long research session         | Summary                 |
| Personal assistant over weeks | Vector                  |
| Quick task completion         | Buffer (10 messages)    |

### Tune Message Limits

Start with defaults and adjust:

```typescript
// Simple chatbot
max_messages: 15;

// Support agent
max_messages: 30;

// Research assistant
max_messages: 50;
```

### Balance Cost and Context

More context = better responses, but higher costs:

| Memory Type    | Token Usage | Context Quality    |
| -------------- | ----------- | ------------------ |
| Buffer (small) | Low         | Recent only        |
| Buffer (large) | High        | Full history       |
| Summary        | Medium      | Compressed history |
| Vector         | Low-Medium  | Relevant excerpts  |

### Clear Memory Strategically

For fresh starts:

```json
{
    "tool": "clear_thread_memory",
    "reason": "Starting new topic"
}
```

Consider clearing when:

- User explicitly requests it
- Topic changes significantly
- Conversation becomes confused

## Memory and Threads

Each agent thread has independent memory:

```
Agent: Support Bot
├── Thread 1 (Customer A): [own memory]
├── Thread 2 (Customer B): [own memory]
└── Thread 3 (Customer C): [own memory]
```

Memory is:

- **Isolated** per thread
- **Persistent** across sessions (same thread)
- **Configurable** at the agent level

## Advanced Patterns

### Hybrid Memory

Combine memory types for complex scenarios:

```typescript
{
  // Recent context (buffer)
  primary: {
    type: "buffer",
    max_messages: 10
  },
  // Long-term recall (vector)
  secondary: {
    type: "vector",
    vector_store_id: "vs_long_term"
  }
}
```

### Memory Extraction

Use LLM to extract and store important facts:

```typescript
// After each turn, extract key information
{
  tool: "update_working_memory",
  facts: {
    extracted_entities: ["deadline: March 15", "budget: $10,000"],
    sentiment: "positive",
    intent: "project_planning"
  }
}
```

### Cross-Thread Knowledge

Share knowledge between threads using shared memory:

```typescript
// Agent 1 stores
await write_shared_memory("customer_123_preferences", preferences);

// Agent 2 retrieves
const prefs = await read_shared_memory("customer_123_preferences");
```

## Debugging Memory

### View Memory State

In the dashboard:

1. Open a thread
2. Click **Memory** tab
3. View current memory contents

### Memory Logs

Check what's being remembered:

```json
{
    "event": "memory_update",
    "timestamp": "2024-01-15T10:30:00Z",
    "type": "working_memory",
    "changes": {
        "added": ["user_preference"],
        "updated": ["current_task"],
        "removed": []
    }
}
```

### Context Inspection

See what context the agent receives:

```json
{
  "context": {
    "system_prompt": "...",
    "memory_summary": "User is planning a product launch for Q2...",
    "recent_messages": [...],
    "working_memory": {...},
    "retrieved_context": [...]
  }
}
```

## Memory Limits

| Resource               | Limit        |
| ---------------------- | ------------ |
| Max messages (buffer)  | 100          |
| Max messages (summary) | 500          |
| Max messages (vector)  | 10,000       |
| Working memory keys    | 50           |
| Working memory size    | 50KB         |
| Summary length         | 2,000 tokens |
