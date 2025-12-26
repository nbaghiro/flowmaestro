---
sidebar_position: 2
title: Documents
---

# Managing Documents

Add documents to your knowledge bases.

## Supported Formats

| Format   | Extension |
| -------- | --------- |
| PDF      | `.pdf`    |
| Word     | `.docx`   |
| Text     | `.txt`    |
| Markdown | `.md`     |
| HTML     | `.html`   |

## Uploading Documents

### Via UI

1. Navigate to your knowledge base
2. Click **Add Documents**
3. Select files to upload
4. Wait for processing

### Via API

```bash
curl -X POST https://api.flowmaestro.ai/knowledge-bases/{id}/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.pdf"
```

## Document Processing

1. **Text Extraction** — Content extracted from the file
2. **Cleaning** — Formatting normalized, noise removed
3. **Chunking** — Split into ~500 token chunks with overlap
4. **Embedding** — Each chunk converted to vectors
5. **Indexing** — Stored in vector database

:::tip
Keep documents focused. Smaller, topic-specific documents often provide better search results.
:::
