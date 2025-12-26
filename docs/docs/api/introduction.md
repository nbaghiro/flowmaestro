---
sidebar_position: 1
title: API Introduction
---

# FlowMaestro API

Programmatically manage workflows, agents, and execute automations.

## Base URL

```
https://api.flowmaestro.ai
```

## Request Format

- All requests should use JSON for request bodies
- Set `Content-Type: application/json` header
- Responses are always JSON

## Response Format

```json
{
    "success": true,
    "data": {}
}
```

Error responses:

```json
{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "Workflow not found"
    }
}
```

## Rate Limits

| Plan       | Requests/minute |
| ---------- | --------------- |
| Free       | 60              |
| Pro        | 300             |
| Enterprise | Custom          |

## Pagination

```
GET /v1/workflows?page=1&limit=20
```

Response includes:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
