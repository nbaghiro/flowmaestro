"""
Workflows resource.
"""
from __future__ import annotations

from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sync_client import SyncHttpClient


class SyncWorkflows:
    """Synchronous workflows resource."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all workflows.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with workflows.

        Example:
            response = client.workflows.list()
            for workflow in response["data"]:
                print(f"- {workflow['name']} ({workflow['id']})")
        """
        return self._http.get(
            "/api/v1/workflows",
            params={"page": page, "per_page": per_page},
        )

    def get(self, workflow_id: str) -> dict[str, Any]:
        """
        Get a workflow by ID.

        Args:
            workflow_id: The workflow ID.

        Returns:
            Response containing the workflow.

        Example:
            response = client.workflows.get("wf_123")
            workflow = response["data"]
            print(f"Workflow: {workflow['name']}")
        """
        return self._http.get(f"/api/v1/workflows/{workflow_id}")

    def execute(
        self,
        workflow_id: str,
        *,
        inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a workflow.

        Args:
            workflow_id: The workflow ID.
            inputs: Input values for the workflow.

        Returns:
            Response containing execution details.

        Example:
            response = client.workflows.execute(
                "wf_123",
                inputs={"name": "John", "email": "john@example.com"}
            )
            execution_id = response["data"]["execution_id"]
            print(f"Started execution: {execution_id}")
        """
        return self._http.post(
            f"/api/v1/workflows/{workflow_id}/execute",
            json={"inputs": inputs or {}},
        )


class AsyncWorkflows:
    """Asynchronous workflows resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all workflows.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with workflows.

        Example:
            response = await client.workflows.list()
            for workflow in response["data"]:
                print(f"- {workflow['name']} ({workflow['id']})")
        """
        return await self._http.get(
            "/api/v1/workflows",
            params={"page": page, "per_page": per_page},
        )

    async def get(self, workflow_id: str) -> dict[str, Any]:
        """
        Get a workflow by ID.

        Args:
            workflow_id: The workflow ID.

        Returns:
            Response containing the workflow.

        Example:
            response = await client.workflows.get("wf_123")
            workflow = response["data"]
            print(f"Workflow: {workflow['name']}")
        """
        return await self._http.get(f"/api/v1/workflows/{workflow_id}")

    async def execute(
        self,
        workflow_id: str,
        *,
        inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a workflow.

        Args:
            workflow_id: The workflow ID.
            inputs: Input values for the workflow.

        Returns:
            Response containing execution details.

        Example:
            response = await client.workflows.execute(
                "wf_123",
                inputs={"name": "John", "email": "john@example.com"}
            )
            execution_id = response["data"]["execution_id"]
            print(f"Started execution: {execution_id}")
        """
        return await self._http.post(
            f"/api/v1/workflows/{workflow_id}/execute",
            json={"inputs": inputs or {}},
        )
