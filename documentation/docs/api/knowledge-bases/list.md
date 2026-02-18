---
sidebar_position: 1
title: List Knowledge Bases
---

# List Knowledge Bases

List all knowledge bases for the authenticated user.

```
GET /api/v1/knowledge-bases
```

**Required Scope:** `knowledge-bases:read`

## Request

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/knowledge-bases" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "kb_abc123",
            "name": "Product Documentation",
            "description": "Technical docs for our products",
            "document_count": 156,
            "chunk_count": 2340,
            "created_at": "2024-01-01T00:00:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 3,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```
