"""
FlowMaestro SDK Types
"""
from __future__ import annotations

from typing import Any, Callable, Literal, TypedDict

# Execution status
ExecutionStatus = Literal["pending", "running", "completed", "failed", "cancelled"]

# Thread status
ThreadStatus = Literal["active", "archived", "deleted"]

# Webhook event types
WebhookEventType = Literal[
    "execution.started",
    "execution.completed",
    "execution.failed",
    "thread.message.created",
    "thread.message.completed",
]

# Execution event types
ExecutionEventType = Literal[
    "connected",
    "execution:started",
    "execution:progress",
    "node:started",
    "node:completed",
    "node:failed",
    "execution:completed",
    "execution:failed",
    "execution:cancelled",
]

# Thread event types
ThreadEventType = Literal[
    "connected",
    "message:started",
    "message:token",
    "message:completed",
    "message:failed",
]


class ResponseMeta(TypedDict):
    """Response metadata."""

    request_id: str
    timestamp: str


class PaginationInfo(TypedDict):
    """Pagination information."""

    page: int
    per_page: int
    total_count: int
    has_more: bool


class WorkflowInput(TypedDict, total=False):
    """Workflow input schema."""

    type: str
    label: str
    required: bool
    description: str


class Workflow(TypedDict):
    """Workflow resource."""

    id: str
    name: str
    description: str | None
    version: int
    inputs: dict[str, WorkflowInput] | None
    created_at: str
    updated_at: str


class ExecuteWorkflowResponse(TypedDict):
    """Response from executing a workflow."""

    execution_id: str
    workflow_id: str
    status: ExecutionStatus
    inputs: dict[str, Any]


class Execution(TypedDict):
    """Execution resource."""

    id: str
    workflow_id: str
    status: ExecutionStatus
    inputs: dict[str, Any]
    outputs: dict[str, Any] | None
    error: str | None
    started_at: str | None
    completed_at: str | None
    created_at: str


class ExecutionEvent(TypedDict, total=False):
    """Execution SSE event."""

    type: ExecutionEventType
    execution_id: str
    status: ExecutionStatus
    outputs: dict[str, Any]
    error: str
    node_id: str
    node_type: str
    progress: float
    message: str
    completed_at: str


class Agent(TypedDict):
    """Agent resource."""

    id: str
    name: str
    description: str | None
    system_prompt: str | None
    model: str
    created_at: str
    updated_at: str


class Thread(TypedDict):
    """Thread resource."""

    id: str
    agent_id: str
    status: ThreadStatus
    metadata: dict[str, Any] | None
    created_at: str
    updated_at: str


class ThreadMessage(TypedDict):
    """Thread message."""

    id: str
    thread_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: str


class SendMessageResponse(TypedDict):
    """Response from sending a message."""

    message_id: str
    thread_id: str
    status: Literal["pending", "processing", "completed", "failed"]


class ThreadEvent(TypedDict, total=False):
    """Thread SSE event."""

    type: ThreadEventType
    thread_id: str
    message_id: str
    content: str
    token: str
    error: str


class Trigger(TypedDict):
    """Trigger resource."""

    id: str
    workflow_id: str
    name: str
    trigger_type: str
    enabled: bool
    last_triggered_at: str | None
    trigger_count: int
    created_at: str
    updated_at: str


class ExecuteTriggerResponse(TypedDict):
    """Response from executing a trigger."""

    execution_id: str
    workflow_id: str
    trigger_id: str
    status: ExecutionStatus
    inputs: dict[str, Any]


class KnowledgeBase(TypedDict):
    """Knowledge base resource."""

    id: str
    name: str
    description: str | None
    embedding_model: str
    document_count: int
    chunk_count: int
    created_at: str
    updated_at: str


class KnowledgeBaseResult(TypedDict):
    """Knowledge base search result."""

    chunk_id: str
    document_id: str
    content: str
    similarity: float
    metadata: dict[str, Any]


class QueryKnowledgeBaseResponse(TypedDict):
    """Response from querying a knowledge base."""

    results: list[KnowledgeBaseResult]
    query: str
    knowledge_base_id: str


class Webhook(TypedDict):
    """Webhook resource."""

    id: str
    name: str
    url: str
    events: list[WebhookEventType]
    is_active: bool
    created_at: str
    updated_at: str


class TestWebhookResponse(TypedDict):
    """Response from testing a webhook."""

    success: bool
    status_code: int
    response_time_ms: int
    error: str | None


class ApiError(TypedDict):
    """API error details."""

    code: str
    message: str
    details: dict[str, Any] | None


# Callback types for streaming
OnEventCallback = Callable[[Any], None]
OnTokenCallback = Callable[[str], None]
OnErrorCallback = Callable[[Exception], None]
OnCloseCallback = Callable[[], None]
