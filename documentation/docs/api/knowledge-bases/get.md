---
sidebar_position: 2
title: Get Knowledge Base
---

# Get Knowledge Base

Get details of a specific knowledge base.

```
GET /api/v1/knowledge-bases/:id
```

**Required Scope:** `knowledge-bases:read`

## Request

### Path Parameters

| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| `id`      | string | Knowledge Base ID |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/knowledge-bases/kb_abc123" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "kb_abc123",
        "name": "Product Documentation",
        "description": "Technical docs for our products",
        "embedding_model": "text-embedding-3-small",
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "document_count": 156,
        "chunk_count": 2340,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description              |
| ------ | -------------------- | ------------------------ |
| 404    | `resource_not_found` | Knowledge base not found |
