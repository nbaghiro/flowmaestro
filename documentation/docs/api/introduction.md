---
sidebar_position: 1
title: API Introduction
---

# FlowMaestro API

Programmatically manage workflows, agents, and execute automations.

## Base URL

```
https://api.flowmaestro.ai/v1
```

## Request Format

- All requests should use JSON for request bodies
- Set `Content-Type: application/json` header
- Authenticate with `X-API-Key` or `Authorization: Bearer` header

## Response Format

All successful responses follow this structure:

```json
{
    "data": {
        // Response object
    },
    "meta": {
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

Paginated responses include pagination info:

```json
{
    "data": [...],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 150,
        "total_pages": 8,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Error Response Format

```json
{
    "error": {
        "code": "resource_not_found",
        "message": "Workflow not found",
        "details": {}
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

### Error Codes

| Code                  | HTTP Status | Description                     |
| --------------------- | ----------- | ------------------------------- |
| `invalid_api_key`     | 401         | Missing or invalid API key      |
| `expired_api_key`     | 401         | API key has expired             |
| `revoked_api_key`     | 401         | API key has been revoked        |
| `insufficient_scope`  | 403         | Missing required scope          |
| `rate_limit_exceeded` | 429         | Rate limit exceeded             |
| `resource_not_found`  | 404         | Resource not found              |
| `validation_error`    | 400         | Invalid input data              |
| `execution_failed`    | 500         | Execution error                 |
| `internal_error`      | 500         | Server error                    |
| `service_unavailable` | 503         | Service temporarily unavailable |

## Rate Limiting

Rate limits are configured per API key with both per-minute and per-day limits.

### Rate Limit Headers

Every response includes rate limit information:

| Header                      | Description                      |
| --------------------------- | -------------------------------- |
| `X-RateLimit-Limit`         | Requests allowed per minute      |
| `X-RateLimit-Remaining`     | Requests remaining this minute   |
| `X-RateLimit-Reset`         | Unix timestamp when limit resets |
| `X-RateLimit-Limit-Day`     | Requests allowed per day         |
| `X-RateLimit-Remaining-Day` | Requests remaining today         |

When rate limited (429 response), the `Retry-After` header indicates seconds to wait.

## Pagination

List endpoints support pagination with query parameters:

```
GET /api/v1/workflows?page=1&per_page=20
```

| Parameter  | Default | Max | Description    |
| ---------- | ------- | --- | -------------- |
| `page`     | 1       | -   | Page number    |
| `per_page` | 20      | 100 | Items per page |

## Available Endpoints

| Resource        | Description                          |
| --------------- | ------------------------------------ |
| Workflows       | List, get, and execute workflows     |
| Executions      | Track and manage workflow executions |
| Agents          | List agents and manage conversations |
| Threads         | Manage agent conversation threads    |
| Triggers        | List and execute workflow triggers   |
| Knowledge Bases | Search knowledge bases               |
| Webhooks        | Manage outgoing webhooks             |
