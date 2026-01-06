"""
Agents resource.
"""
from __future__ import annotations

from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sync_client import SyncHttpClient


class SyncAgents:
    """Synchronous agents resource."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all agents.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with agents.

        Example:
            response = client.agents.list()
            for agent in response["data"]:
                print(f"- {agent['name']} ({agent['model']})")
        """
        return self._http.get(
            "/api/v1/agents",
            params={"page": page, "per_page": per_page},
        )

    def get(self, agent_id: str) -> dict[str, Any]:
        """
        Get an agent by ID.

        Args:
            agent_id: The agent ID.

        Returns:
            Response containing the agent.

        Example:
            response = client.agents.get("agent_123")
            agent = response["data"]
            print(f"Agent: {agent['name']}")
        """
        return self._http.get(f"/api/v1/agents/{agent_id}")

    def create_thread(
        self,
        agent_id: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new conversation thread for an agent.

        Args:
            agent_id: The agent ID.
            metadata: Optional metadata for the thread.

        Returns:
            Response containing the created thread.

        Example:
            response = client.agents.create_thread(
                "agent_123",
                metadata={"user_id": "user_456"}
            )
            thread = response["data"]
            print(f"Created thread: {thread['id']}")
        """
        return self._http.post(
            f"/api/v1/agents/{agent_id}/threads",
            json={"metadata": metadata},
        )


class AsyncAgents:
    """Asynchronous agents resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all agents.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with agents.

        Example:
            response = await client.agents.list()
            for agent in response["data"]:
                print(f"- {agent['name']} ({agent['model']})")
        """
        return await self._http.get(
            "/api/v1/agents",
            params={"page": page, "per_page": per_page},
        )

    async def get(self, agent_id: str) -> dict[str, Any]:
        """
        Get an agent by ID.

        Args:
            agent_id: The agent ID.

        Returns:
            Response containing the agent.

        Example:
            response = await client.agents.get("agent_123")
            agent = response["data"]
            print(f"Agent: {agent['name']}")
        """
        return await self._http.get(f"/api/v1/agents/{agent_id}")

    async def create_thread(
        self,
        agent_id: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new conversation thread for an agent.

        Args:
            agent_id: The agent ID.
            metadata: Optional metadata for the thread.

        Returns:
            Response containing the created thread.

        Example:
            response = await client.agents.create_thread(
                "agent_123",
                metadata={"user_id": "user_456"}
            )
            thread = response["data"]
            print(f"Created thread: {thread['id']}")
        """
        return await self._http.post(
            f"/api/v1/agents/{agent_id}/threads",
            json={"metadata": metadata},
        )
