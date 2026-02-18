---
sidebar_position: 3
title: Querying
---

# Querying Knowledge Bases

Search and retrieve information from your documents using semantic similarity.

## How Semantic Search Works

Unlike keyword search, semantic search finds content based on **meaning**:

```
Query: "How do I get a refund?"

Matches (by semantic similarity):
1. "Return policy: Customers can request refunds within 30 days..."
2. "Refund process: Contact support to initiate a return..."
3. "Money-back guarantee information..."
```

The query is converted to a vector embedding and compared against document chunks using cosine similarity.

## Query Methods

### Agent Integration

When you attach a knowledge base to an agent, it automatically searches:

```
User: What's your return policy?

Agent: [Searches knowledge base]
       Based on our documentation, our return policy allows...
```

The agent:

1. Receives the user question
2. Searches the knowledge base
3. Retrieves relevant chunks
4. Includes them in context
5. Generates a response

### Workflow Integration

Use the **Knowledge Base Query** node:

```typescript
{
  knowledgeBaseId: "kb_abc123",
  query: "{{user.question}}",
  topK: 5,
  threshold: 0.7,
  outputVariable: "search_results"
}
```

**Output:**

```typescript
{
  results: [
    {
      content: "Return policy: Customers can request refunds...",
      score: 0.92,
      metadata: {
        documentId: "doc_123",
        fileName: "policies.pdf",
        pageNumber: 5
      }
    },
    {
      content: "Refund process: Contact support to initiate...",
      score: 0.87,
      metadata: {
        documentId: "doc_456",
        fileName: "faq.md"
      }
    }
  ],
  totalMatches: 2
}
```

### API Querying

```bash
POST /api/knowledge-bases/{id}/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the return policy?",
    "topK": 5,
    "threshold": 0.7
  }'
```

**Response:**

```json
{
    "results": [
        {
            "content": "Return policy: Customers can request refunds...",
            "score": 0.92,
            "metadata": {
                "documentId": "doc_123",
                "fileName": "policies.pdf",
                "pageNumber": 5
            }
        }
    ],
    "query": "What is the return policy?",
    "processingTime": 45
}
```

## Query Parameters

| Parameter   | Type   | Default  | Description                    |
| ----------- | ------ | -------- | ------------------------------ |
| `query`     | string | Required | The search query               |
| `topK`      | number | 5        | Maximum results to return      |
| `threshold` | number | 0.0      | Minimum similarity score (0-1) |
| `filter`    | object | null     | Metadata filters               |

### topK (Result Count)

Control how many results to retrieve:

```typescript
// Few, highly relevant results
{
    topK: 3;
}

// More results for comprehensive coverage
{
    topK: 10;
}
```

**Recommendations:**

- Simple Q&A: 3-5 results
- Research tasks: 10-15 results
- Comprehensive search: 20+ results

### threshold (Minimum Score)

Filter out low-relevance results:

```typescript
// Only highly relevant matches
{
    threshold: 0.8;
}

// Include moderately relevant matches
{
    threshold: 0.5;
}

// Return all matches (default)
{
    threshold: 0.0;
}
```

**Score interpretation:**

- 0.9+ : Very high relevance
- 0.7-0.9 : High relevance
- 0.5-0.7 : Moderate relevance
- Below 0.5 : Low relevance

### Metadata Filters

Filter by document metadata:

```typescript
{
  query: "return policy",
  filter: {
    department: "support",
    version: "2.0"
  }
}
```

## Query Results

### Result Structure

Each result contains:

```typescript
{
  // The matched chunk content
  content: "Full text of the matched chunk...",

  // Similarity score (0-1)
  score: 0.92,

  // Metadata about the source
  metadata: {
    documentId: "doc_123",
    fileName: "guide.pdf",
    pageNumber: 5,
    chunkIndex: 12,
    // Custom metadata
    department: "engineering",
    version: "2.0"
  }
}
```

### Using Results

In workflows, access results with variables:

```typescript
// All results
{
    {
        kb_query.results;
    }
}

// First result content
{
    {
        kb_query.results[0].content;
    }
}

// First result score
{
    {
        kb_query.results[0].score;
    }
}

// Concatenate top results
{
    {
        kb_query.results.map((r) => r.content).join("\n\n");
    }
}
```

## Performance Characteristics

### Query Speed

| Knowledge Base Size     | Typical Query Time |
| ----------------------- | ------------------ |
| < 1,000 chunks          | < 50ms             |
| 1,000 - 10,000 chunks   | 50-100ms           |
| 10,000 - 100,000 chunks | 100-200ms          |
| > 100,000 chunks        | 200-500ms          |

### Factors Affecting Speed

- **Vector dimensions**: Higher = slower, more accurate
- **Number of chunks**: More chunks = slower
- **topK value**: Higher = slightly slower
- **Database load**: Varies with system usage

## Advanced Querying

### Multi-Query Strategy

For better coverage, query multiple ways:

```typescript
// In a workflow
const queries = ["original query", "rephrased query", "related concept query"];

// Query each and combine results
const allResults = await Promise.all(queries.map((q) => queryKB(kbId, q)));

// Deduplicate and re-rank
const merged = deduplicateResults(allResults);
```

### Hybrid Search

Combine semantic and keyword search:

```typescript
{
  query: "return policy",
  searchMode: "hybrid",
  keywordWeight: 0.3,
  semanticWeight: 0.7
}
```

### Re-ranking

Use an LLM to re-rank results:

```typescript
// After KB query
const results = await queryKB(kbId, query);

// Re-rank with LLM
const reranked = await llm.rerank(query, results, {
    model: "gpt-4o-mini"
});
```

## RAG Pattern

The standard RAG (Retrieval-Augmented Generation) pattern:

```
1. User Query
       ↓
2. Query Knowledge Base
       ↓
3. Retrieve Relevant Chunks
       ↓
4. Build Context with Chunks
       ↓
5. Send to LLM with Context
       ↓
6. Generate Response
```

### Example Workflow

```typescript
// 1. Query knowledge base
const results = await kb.query({
    query: userQuestion,
    topK: 5,
    threshold: 0.7
});

// 2. Build context
const context = results.map((r) => r.content).join("\n\n---\n\n");

// 3. Generate response
const response = await llm.chat({
    messages: [
        {
            role: "system",
            content: `Answer based on the following context:\n\n${context}`
        },
        {
            role: "user",
            content: userQuestion
        }
    ]
});
```

## Debugging Queries

### Low Relevance Results

**Symptoms:** Results don't match the query intent

**Solutions:**

1. Improve query specificity
2. Lower the threshold
3. Increase topK
4. Review document chunking
5. Add more relevant documents

### No Results

**Symptoms:** Empty results array

**Solutions:**

1. Lower or remove threshold
2. Check knowledge base has documents
3. Verify documents are in `ready` status
4. Try broader query terms

### Slow Queries

**Symptoms:** Query takes too long

**Solutions:**

1. Add metadata filters
2. Reduce topK
3. Check knowledge base size
4. Review index health

## Best Practices

### Query Formulation

- **Be specific**: "return policy for electronics" vs "returns"
- **Use natural language**: Queries match how content is written
- **Include context**: "refund for damaged item" vs "refund"

### Result Usage

- **Check scores**: Low scores may indicate irrelevance
- **Use multiple results**: Combine for comprehensive answers
- **Preserve source**: Include citations in responses

### Knowledge Base Design

- **Topic-focused KBs**: Separate KBs for different domains
- **Quality content**: Well-written docs yield better results
- **Regular updates**: Keep content current

## Limits

| Resource           | Limit            |
| ------------------ | ---------------- |
| Max topK           | 100              |
| Query timeout      | 30 seconds       |
| Max query length   | 8,000 characters |
| Queries per minute | 60 (per KB)      |
