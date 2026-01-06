"""
Executions resource.
"""
from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator, Iterator
from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sse_client import AsyncSSEClient, SyncSSEClient
from .._http.sync_client import SyncHttpClient
from ..errors import TimeoutError
from ..types import Execution, ExecutionEvent, ExecutionStatus

DEFAULT_POLL_INTERVAL = 1.0
DEFAULT_WAIT_TIMEOUT = 300.0
TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


class SyncExecutions:
    """Synchronous executions resource."""

    def __init__(self, http: SyncHttpClient, sse: SyncSSEClient) -> None:
        self._http = http
        self._sse = sse

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
        workflow_id: str | None = None,
        status: ExecutionStatus | None = None,
    ) -> dict[str, Any]:
        """
        List executions.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.
            workflow_id: Filter by workflow ID.
            status: Filter by status.

        Returns:
            Paginated response with executions.

        Example:
            response = client.executions.list(status="running")
            for execution in response["data"]:
                print(f"- {execution['id']}: {execution['status']}")
        """
        return self._http.get(
            "/api/v1/executions",
            params={
                "page": page,
                "per_page": per_page,
                "workflow_id": workflow_id,
                "status": status,
            },
        )

    def get(self, execution_id: str) -> dict[str, Any]:
        """
        Get an execution by ID.

        Args:
            execution_id: The execution ID.

        Returns:
            Response containing the execution.

        Example:
            response = client.executions.get("exec_123")
            execution = response["data"]
            print(f"Status: {execution['status']}")
        """
        return self._http.get(f"/api/v1/executions/{execution_id}")

    def cancel(self, execution_id: str) -> dict[str, Any]:
        """
        Cancel a running execution.

        Args:
            execution_id: The execution ID.

        Returns:
            Response containing the updated execution.

        Example:
            response = client.executions.cancel("exec_123")
            print(f"Cancelled: {response['data']['status']}")
        """
        return self._http.post(f"/api/v1/executions/{execution_id}/cancel")

    def wait_for_completion(
        self,
        execution_id: str,
        *,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
    ) -> Execution:
        """
        Wait for an execution to complete using polling.

        Args:
            execution_id: The execution ID.
            poll_interval: Seconds between polls (default: 1.0).
            timeout: Maximum wait time in seconds (default: 300.0).

        Returns:
            The completed execution.

        Raises:
            TimeoutError: If execution doesn't complete within timeout.

        Example:
            response = client.workflows.execute("wf_123", inputs={"name": "John"})
            execution = client.executions.wait_for_completion(
                response["data"]["execution_id"]
            )
            print(f"Result: {execution['outputs']}")
        """
        start_time = time.time()

        while True:
            response = self.get(execution_id)
            execution = response["data"]

            if execution["status"] in TERMINAL_STATUSES:
                return execution

            if time.time() - start_time > timeout:
                raise TimeoutError(
                    f"Execution {execution_id} did not complete within {timeout}s"
                )

            time.sleep(poll_interval)

    def stream(self, execution_id: str) -> Iterator[ExecutionEvent]:
        """
        Stream execution events via Server-Sent Events.

        Args:
            execution_id: The execution ID.

        Yields:
            Execution events.

        Example:
            for event in client.executions.stream("exec_123"):
                print(f"Event: {event['type']}")
                if event["type"] == "execution:completed":
                    print(f"Outputs: {event.get('outputs')}")
                    break
        """
        yield from self._sse.stream(f"/api/v1/executions/{execution_id}/events")


class AsyncExecutions:
    """Asynchronous executions resource."""

    def __init__(self, http: AsyncHttpClient, sse: AsyncSSEClient) -> None:
        self._http = http
        self._sse = sse

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
        workflow_id: str | None = None,
        status: ExecutionStatus | None = None,
    ) -> dict[str, Any]:
        """
        List executions.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.
            workflow_id: Filter by workflow ID.
            status: Filter by status.

        Returns:
            Paginated response with executions.

        Example:
            response = await client.executions.list(status="running")
            for execution in response["data"]:
                print(f"- {execution['id']}: {execution['status']}")
        """
        return await self._http.get(
            "/api/v1/executions",
            params={
                "page": page,
                "per_page": per_page,
                "workflow_id": workflow_id,
                "status": status,
            },
        )

    async def get(self, execution_id: str) -> dict[str, Any]:
        """
        Get an execution by ID.

        Args:
            execution_id: The execution ID.

        Returns:
            Response containing the execution.

        Example:
            response = await client.executions.get("exec_123")
            execution = response["data"]
            print(f"Status: {execution['status']}")
        """
        return await self._http.get(f"/api/v1/executions/{execution_id}")

    async def cancel(self, execution_id: str) -> dict[str, Any]:
        """
        Cancel a running execution.

        Args:
            execution_id: The execution ID.

        Returns:
            Response containing the updated execution.

        Example:
            response = await client.executions.cancel("exec_123")
            print(f"Cancelled: {response['data']['status']}")
        """
        return await self._http.post(f"/api/v1/executions/{execution_id}/cancel")

    async def wait_for_completion(
        self,
        execution_id: str,
        *,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
    ) -> Execution:
        """
        Wait for an execution to complete using polling.

        Args:
            execution_id: The execution ID.
            poll_interval: Seconds between polls (default: 1.0).
            timeout: Maximum wait time in seconds (default: 300.0).

        Returns:
            The completed execution.

        Raises:
            TimeoutError: If execution doesn't complete within timeout.

        Example:
            response = await client.workflows.execute("wf_123", inputs={"name": "John"})
            execution = await client.executions.wait_for_completion(
                response["data"]["execution_id"]
            )
            print(f"Result: {execution['outputs']}")
        """
        start_time = time.time()

        while True:
            response = await self.get(execution_id)
            execution = response["data"]

            if execution["status"] in TERMINAL_STATUSES:
                return execution

            if time.time() - start_time > timeout:
                raise TimeoutError(
                    f"Execution {execution_id} did not complete within {timeout}s"
                )

            await asyncio.sleep(poll_interval)

    async def stream(self, execution_id: str) -> AsyncIterator[ExecutionEvent]:
        """
        Stream execution events via Server-Sent Events.

        Args:
            execution_id: The execution ID.

        Yields:
            Execution events.

        Example:
            async for event in client.executions.stream("exec_123"):
                print(f"Event: {event['type']}")
                if event["type"] == "execution:completed":
                    print(f"Outputs: {event.get('outputs')}")
                    break
        """
        async for event in self._sse.stream(f"/api/v1/executions/{execution_id}/events"):
            yield event
