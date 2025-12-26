---
sidebar_position: 4
title: Agent Memory
---

# Agent Memory

Memory enables agents to maintain context and remember important information.

## Memory Types

### Thread Memory

Short-term memory within a single conversation:

- Recent messages
- Current context
- Active tasks

### Working Memory

Agent's scratchpad for the current interaction:

- Extracted facts from the conversation
- Task progress
- Temporary notes

### Long-term Memory

Persistent facts stored across conversations:

- User preferences
- Important information
- Historical context

## Memory Configuration

### Context Window

```yaml
memory:
    contextMessages: 20 # Last 20 messages
```

### Fact Extraction

```yaml
memory:
    extractFacts: true
    factCategories:
        - user_preferences
        - important_dates
        - key_decisions
```

## Best Practices

- **Keep context relevant** — Too much context can confuse the agent
- **Clear old memories** — Periodically clear outdated facts
- **Use structured metadata** — Store facts in a structured format
