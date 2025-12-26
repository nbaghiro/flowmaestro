---
sidebar_position: 3
title: Querying
---

# Querying Knowledge Bases

Search and retrieve information from your documents.

## Agent Integration

When you attach a knowledge base to an agent:

1. Agent receives a user question
2. Automatically searches the knowledge base
3. Retrieves relevant chunks
4. Includes them in context for the response

## Workflow Integration

Use the **Knowledge Base Query** node:

```javascript
// Output
{
    {
        kb_query.results;
    }
} // Array of matching chunks
{
    {
        kb_query.results[0].content;
    }
} // First result text
{
    {
        kb_query.results[0].score;
    }
} // Similarity score
```

## API Querying

```bash
curl -X POST https://api.flowmaestro.ai/knowledge-bases/{id}/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the return policy?",
    "topK": 5
  }'
```

## Search Parameters

| Parameter        | Description              | Default  |
| ---------------- | ------------------------ | -------- |
| `query`          | Search text              | Required |
| `topK`           | Max results to return    | 5        |
| `scoreThreshold` | Minimum similarity (0-1) | 0.0      |
