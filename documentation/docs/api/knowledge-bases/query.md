---
sidebar_position: 3
title: Query Knowledge Base
---

# Query Knowledge Base

Perform semantic search on a knowledge base using vector similarity.

```
POST /api/v1/knowledge-bases/:id/query
```

**Required Scopes:** `knowledge-bases:read`, `knowledge-bases:query`

## Request

### Path Parameters

| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| `id`      | string | Knowledge Base ID |

### Body Parameters

| Parameter | Type   | Required | Default | Description                        |
| --------- | ------ | -------- | ------- | ---------------------------------- |
| `query`   | string | Yes      | -       | Search query text                  |
| `top_k`   | number | No       | 5       | Number of results to return (1-20) |

### Example

```bash
curl -X POST "https://api.flowmaestro.io/api/v1/knowledge-bases/kb_abc123/query" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I reset my password?",
    "top_k": 5
  }'
```

## Response

```json
{
    "data": {
        "results": [
            {
                "id": "chunk_001",
                "content": "To reset your password, go to Settings > Security > Change Password. Enter your current password and then enter your new password twice to confirm...",
                "document_id": "doc_abc",
                "document_name": "User Guide.pdf",
                "score": 0.92,
                "metadata": {
                    "page": 15,
                    "section": "Account Settings"
                }
            },
            {
                "id": "chunk_002",
                "content": "If you've forgotten your password, click 'Forgot Password' on the login page. We'll send a reset link to your registered email address...",
                "document_id": "doc_def",
                "document_name": "FAQ.md",
                "score": 0.87,
                "metadata": {}
            }
        ],
        "query": "How do I reset my password?",
        "top_k": 5
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Response Fields

| Field           | Description                                    |
| --------------- | ---------------------------------------------- |
| `id`            | Unique chunk identifier                        |
| `content`       | Text content of the chunk                      |
| `document_id`   | ID of the source document                      |
| `document_name` | Name of the source document                    |
| `score`         | Similarity score (0-1, higher is more similar) |
| `metadata`      | Additional metadata from the document          |

## Errors

| Status | Code                 | Description              |
| ------ | -------------------- | ------------------------ |
| 404    | `resource_not_found` | Knowledge base not found |
| 400    | `validation_error`   | Invalid query parameters |
