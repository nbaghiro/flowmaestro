---
sidebar_position: 6
title: Building a RAG Agent
---

# Building a RAG Agent

Create an agent that answers questions using your documents.

## What We're Building

A knowledge-powered agent that:

- Searches your uploaded documents
- Provides accurate, sourced answers
- Cites where information came from
- Handles follow-up questions

## What is RAG?

**Retrieval-Augmented Generation (RAG)** combines:

1. **Retrieval** — Find relevant documents via semantic search
2. **Augmentation** — Add document context to the prompt
3. **Generation** — LLM generates answer using that context

```
User Question
      ↓
Search Knowledge Base
      ↓
Retrieve Relevant Chunks
      ↓
Build Context Prompt
      ↓
LLM Generates Answer
      ↓
Response with Citations
```

## Step 1: Create a Knowledge Base

1. Navigate to **Knowledge Bases**
2. Click **New Knowledge Base**
3. Configure:
   - Name: "Product Documentation"
   - Description: "Company product docs and FAQs"

## Step 2: Upload Documents

1. Click **Add Documents**
2. Upload your files:
   - PDFs, Word docs, Markdown
   - Text files, HTML pages
   - Or add from URLs

3. Wait for processing (extract → chunk → embed)

**Supported formats:**

| Format | Best For |
|--------|----------|
| PDF | Product manuals, policies |
| Markdown | Technical docs, guides |
| HTML | Web pages, help articles |
| TXT | Plain text content |

## Step 3: Configure Chunking

Adjust how documents are split:

```typescript
{
  chunkSize: 1000,      // Characters per chunk
  chunkOverlap: 200,    // Overlap for context
  chunkingStrategy: "semantic"  // Respects paragraphs
}
```

**Recommendations:**

- FAQ content: 500 chars (precise matches)
- Technical docs: 1000 chars (balanced)
- Long-form content: 1500 chars (more context)

## Step 4: Create the Agent

1. Go to **Agents** > **New Agent**
2. Choose **General Assistant** template
3. Configure:
   - Name: "Documentation Assistant"
   - Model: claude-sonnet-4-5 (good at following instructions)

## Step 5: Write the System Prompt

```
You are a documentation assistant for Acme Inc.

Your role:
- Answer questions using ONLY the provided documentation
- Always cite your sources with document names
- If information isn't in the docs, say "I don't have information about that"
- Be concise but complete

When answering:
1. Search the knowledge base first
2. Quote relevant sections when helpful
3. Provide document references

Never make up information not in the documents.
```

## Step 6: Add the Knowledge Base Tool

1. Click the **Tools** tab
2. Click **Add Tool** > **Knowledge Base**
3. Configure:

```typescript
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_product_docs",
  name: "search_documentation",
  description: "Search product documentation and FAQ for answers"
}
```

## Step 7: Test the Agent

Start a conversation:

```
User: How do I reset my password?

Agent: Based on our documentation, here's how to reset your password:

1. Go to the login page and click "Forgot Password"
2. Enter your email address
3. Check your inbox for the reset link
4. Click the link and create a new password

Source: account-management.pdf, page 12
```

## Advanced Configuration

### Query Parameters

Fine-tune retrieval in the tool config:

```typescript
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_product_docs",
  queryConfig: {
    topK: 5,           // Number of chunks to retrieve
    threshold: 0.7,    // Minimum similarity score
    includeMetadata: true  // Include source info
  }
}
```

### Multiple Knowledge Bases

Add multiple tools for different domains:

```typescript
// Tool 1: Product docs
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_product_docs",
  name: "search_product_docs",
  description: "Search product documentation"
}

// Tool 2: Policy docs
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_policies",
  name: "search_policies",
  description: "Search company policies and guidelines"
}
```

The agent will choose which knowledge base to search based on the question.

### Hybrid Search

Combine semantic and keyword search:

```typescript
{
  queryConfig: {
    searchMode: "hybrid",
    keywordWeight: 0.3,
    semanticWeight: 0.7
  }
}
```

## Improving Quality

### Better Chunks

- Use semantic chunking for prose
- Keep related content together
- Include section headers in chunks

### Better Prompts

- Instruct the agent to search before answering
- Require citations for factual claims
- Set expectations for "I don't know" responses

### Better Documents

- Clean, well-structured content
- Remove duplicate information
- Update outdated documents

## Example Conversation

```
User: What's your refund policy?

Agent: [Searches knowledge base]

According to our policies, we offer:

**Standard Refunds:**
- Full refund within 30 days of purchase
- Item must be unused and in original packaging
- Refund processed to original payment method

**Enterprise Refunds:**
- Pro-rated refunds after 30 days
- Contact account manager for processing

Source: refund-policy.pdf

User: What if the item is damaged?

Agent: [Searches knowledge base]

For damaged items, we have a separate process:

- Report damage within 48 hours of delivery
- Include photos of the damage
- We'll send a replacement or issue full refund
- No return shipping required

Source: refund-policy.pdf, section "Damaged Items"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent doesn't find relevant docs | Lower threshold, increase topK |
| Wrong information retrieved | Improve chunking, add metadata |
| Agent makes up facts | Strengthen system prompt instructions |
| Slow responses | Reduce topK, optimize chunk size |

## Next Steps

- [Knowledge base configuration](../core-concepts/knowledge-bases/) — Advanced settings
- [Document management](../core-concepts/knowledge-bases/documents) — Uploading and processing
- [Query optimization](../core-concepts/knowledge-bases/querying) — Improve retrieval
