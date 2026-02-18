---
sidebar_position: 2
title: Documents
---

# Managing Documents

Add documents to your knowledge bases for semantic search and RAG-powered AI responses.

## Supported File Types

| Format       | Extension       | Description                                   |
| ------------ | --------------- | --------------------------------------------- |
| **PDF**      | `.pdf`          | Full text extraction with layout preservation |
| **Word**     | `.docx`, `.doc` | Microsoft Word documents                      |
| **Text**     | `.txt`          | Plain text files                              |
| **Markdown** | `.md`           | Markdown with formatting                      |
| **HTML**     | `.html`, `.htm` | Web pages and HTML documents                  |
| **JSON**     | `.json`         | Structured JSON data                          |
| **CSV**      | `.csv`          | Tabular data                                  |
| **Code**     | Various         | Source code files (JS, TS, PY, etc.)          |

## Adding Documents

### Via Dashboard

1. Navigate to **Knowledge Bases** > your knowledge base
2. Click **Add Documents**
3. Drag and drop files or click to browse
4. Wait for processing to complete

<!-- Screenshot: Document upload interface -->

### Via API

```bash
# Upload a file
curl -X POST https://api.flowmaestro.ai/knowledge-bases/{id}/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.pdf"

# Add from URL
curl -X POST https://api.flowmaestro.ai/knowledge-bases/{id}/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page",
    "title": "Page Title"
  }'
```

### From URLs

Add web pages directly:

1. Click **Add from URL**
2. Enter the URL
3. Optionally scrape subpages
4. FlowMaestro fetches and processes the content

**URL options:**

- **Scraping mode**: html, text, or markdown
- **Include subpages**: Follow links on the page
- **Max depth**: How many levels deep to crawl

## Document Processing Pipeline

When you upload a document, it goes through several stages:

### 1. Text Extraction

Content is extracted based on file type:

| File Type | Extraction Method                   |
| --------- | ----------------------------------- |
| PDF       | Text layer extraction, OCR fallback |
| DOCX      | XML parsing with style preservation |
| HTML      | DOM parsing, content extraction     |
| Markdown  | Parsed and normalized               |
| JSON      | Converted to readable text          |
| CSV       | Tabular structure preserved         |

### 2. Cleaning

Text is normalized:

- Whitespace normalization
- Special character handling
- Encoding fixes
- Noise removal (headers, footers, page numbers)

### 3. Chunking

Documents are split into searchable chunks:

```typescript
{
  chunkSize: 1000,     // Characters per chunk
  chunkOverlap: 200    // Overlap between chunks
}
```

**Chunking strategies:**

| Strategy      | Description                            | Best For             |
| ------------- | -------------------------------------- | -------------------- |
| **Fixed**     | Fixed character count                  | General use          |
| **Semantic**  | Respects sentence/paragraph boundaries | Prose documents      |
| **Recursive** | Splits by headers, then paragraphs     | Structured documents |

### 4. Embedding

Each chunk is converted to a vector embedding:

```
"This is chunk text..." → [0.012, -0.034, 0.056, ...] (1536 dimensions)
```

FlowMaestro uses `text-embedding-3-small` by default.

### 5. Storage

Embeddings are stored in a vector database (PostgreSQL with pgvector):

```sql
-- Each chunk becomes a row
documents (
  id,
  knowledge_base_id,
  content,
  embedding,
  metadata,
  created_at
)
```

## Processing Status

Documents progress through statuses:

| Status       | Description             |
| ------------ | ----------------------- |
| `pending`    | Queued for processing   |
| `extracting` | Extracting text content |
| `chunking`   | Splitting into chunks   |
| `embedding`  | Generating embeddings   |
| `ready`      | Available for queries   |
| `failed`     | Processing error        |

View status in the dashboard or via API:

```bash
GET /api/knowledge-bases/{id}/documents/{docId}

{
  "id": "doc_123",
  "status": "ready",
  "filename": "guide.pdf",
  "chunks": 45,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Chunking Configuration

Adjust chunking for your content:

### Small Chunks (500 chars)

```typescript
{
  chunkSize: 500,
  chunkOverlap: 100
}
```

**Pros:** More precise retrieval
**Cons:** May lose context
**Best for:** FAQ, glossaries, short answers

### Large Chunks (2000 chars)

```typescript
{
  chunkSize: 2000,
  chunkOverlap: 400
}
```

**Pros:** More context per result
**Cons:** Less precise matching
**Best for:** Technical docs, long-form content

### Overlap

Overlap ensures context isn't lost at chunk boundaries:

```
Chunk 1: [-------content-------]
Chunk 2:              [-------content-------]
                 ^^^^
                overlap
```

## Metadata

Documents include metadata for filtering:

```typescript
{
  filename: "guide.pdf",
  title: "Product Guide",
  mimeType: "application/pdf",
  fileSize: 1024000,
  pageCount: 25,
  author: "Jane Smith",
  createdAt: "2024-01-15T10:30:00Z",
  url: "https://example.com/guide",
  tags: ["product", "guide"]
}
```

Add custom metadata via API:

```bash
POST /api/knowledge-bases/{id}/documents \
  -F "file=@doc.pdf" \
  -F "metadata={\"department\":\"engineering\",\"version\":\"2.0\"}"
```

## Managing Documents

### View Documents

```bash
GET /api/knowledge-bases/{id}/documents

{
  "documents": [
    {
      "id": "doc_123",
      "filename": "guide.pdf",
      "status": "ready",
      "chunks": 45,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Delete Document

```bash
DELETE /api/knowledge-bases/{id}/documents/{docId}
```

Deleting removes:

- The document record
- All associated chunks
- All embeddings

### Reprocess Document

Force reprocessing with new settings:

```bash
POST /api/knowledge-bases/{id}/documents/{docId}/reprocess

{
  "chunkSize": 1500,
  "chunkOverlap": 300
}
```

## Error Handling

### Common Errors

| Error                | Cause                   | Solution                                   |
| -------------------- | ----------------------- | ------------------------------------------ |
| `extraction_failed`  | Can't read file content | Check file format, re-upload               |
| `pdf_encrypted`      | PDF has password        | Remove password or use unprotected version |
| `file_too_large`     | Exceeds size limit      | Split into smaller files                   |
| `unsupported_format` | File type not supported | Convert to supported format                |
| `embedding_failed`   | Vector generation error | Retry, check content encoding              |

### Retrying Failed Documents

```bash
POST /api/knowledge-bases/{id}/documents/{docId}/retry
```

## Best Practices

### Document Organization

- **Keep documents focused** — One topic per document yields better results
- **Use descriptive filenames** — Helps with search and management
- **Add relevant metadata** — Enables filtering and categorization

### Content Quality

- **Clean formatting** — Remove excessive whitespace and formatting
- **No scanned images** — Use text-based PDFs when possible
- **Proper encoding** — Ensure UTF-8 encoding

### Chunking Strategy

- **Match content type** — Technical docs need larger chunks
- **Test and iterate** — Query performance reveals optimal settings
- **Consider overlap** — Higher overlap for dense content

### Maintenance

- **Remove outdated docs** — Keep knowledge base current
- **Reprocess after changes** — Update chunks when settings change
- **Monitor query quality** — Poor results may indicate content issues

## Limits

| Resource                | Limit      |
| ----------------------- | ---------- |
| Max file size           | 100 MB     |
| Max documents per KB    | 10,000     |
| Max chunks per document | 10,000     |
| Supported file types    | 8 types    |
| URL fetch timeout       | 30 seconds |
