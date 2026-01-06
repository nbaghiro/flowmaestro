"""
Triggers resource.
"""
from __future__ import annotations

from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sync_client import SyncHttpClient


class SyncTriggers:
    """Synchronous triggers resource."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all triggers.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with triggers.

        Example:
            response = client.triggers.list()
            for trigger in response["data"]:
                print(f"- {trigger['name']} ({trigger['trigger_type']})")
                print(f"  Enabled: {trigger['enabled']}")
                print(f"  Triggered {trigger['trigger_count']} times")
        """
        return self._http.get(
            "/api/v1/triggers",
            params={"page": page, "per_page": per_page},
        )

    def execute(
        self,
        trigger_id: str,
        *,
        inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a trigger manually.

        Args:
            trigger_id: The trigger ID.
            inputs: Input values for the trigger.

        Returns:
            Response containing execution details.

        Example:
            response = client.triggers.execute(
                "trigger_123",
                inputs={"webhook_payload": {"event": "user.created"}}
            )
            execution_id = response["data"]["execution_id"]
            print(f"Started execution: {execution_id}")
        """
        return self._http.post(
            f"/api/v1/triggers/{trigger_id}/execute",
            json={"inputs": inputs or {}},
        )


class AsyncTriggers:
    """Asynchronous triggers resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all triggers.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with triggers.

        Example:
            response = await client.triggers.list()
            for trigger in response["data"]:
                print(f"- {trigger['name']} ({trigger['trigger_type']})")
                print(f"  Enabled: {trigger['enabled']}")
                print(f"  Triggered {trigger['trigger_count']} times")
        """
        return await self._http.get(
            "/api/v1/triggers",
            params={"page": page, "per_page": per_page},
        )

    async def execute(
        self,
        trigger_id: str,
        *,
        inputs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a trigger manually.

        Args:
            trigger_id: The trigger ID.
            inputs: Input values for the trigger.

        Returns:
            Response containing execution details.

        Example:
            response = await client.triggers.execute(
                "trigger_123",
                inputs={"webhook_payload": {"event": "user.created"}}
            )
            execution_id = response["data"]["execution_id"]
            print(f"Started execution: {execution_id}")
        """
        return await self._http.post(
            f"/api/v1/triggers/{trigger_id}/execute",
            json={"inputs": inputs or {}},
        )
