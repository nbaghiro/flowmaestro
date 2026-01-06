"""
FlowMaestro Client.

The main entry point for the FlowMaestro SDK.
"""
from __future__ import annotations

from typing import Any

from ._http.async_client import AsyncHttpClient
from ._http.sse_client import AsyncSSEClient, SyncSSEClient
from ._http.sync_client import SyncHttpClient
from .resources.agents import AsyncAgents, SyncAgents
from .resources.executions import AsyncExecutions, SyncExecutions
from .resources.knowledge_bases import AsyncKnowledgeBases, SyncKnowledgeBases
from .resources.threads import AsyncThreads, SyncThreads
from .resources.triggers import AsyncTriggers, SyncTriggers
from .resources.webhooks import AsyncWebhooks, SyncWebhooks
from .resources.workflows import AsyncWorkflows, SyncWorkflows


class FlowMaestroClient:
    """
    Synchronous FlowMaestro API client.

    Example:
        from flowmaestro import FlowMaestroClient

        client = FlowMaestroClient(api_key="fm_live_...")

        # Execute a workflow
        response = client.workflows.execute("wf_123", inputs={"name": "John"})
        execution_id = response["data"]["execution_id"]

        # Wait for completion
        result = client.executions.wait_for_completion(execution_id)
        print(f"Result: {result['outputs']}")

        # Clean up
        client.close()

    Using as context manager:
        with FlowMaestroClient(api_key="fm_live_...") as client:
            response = client.workflows.list()
            print(response["data"])
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        """
        Create a new FlowMaestro client.

        Args:
            api_key: Your FlowMaestro API key.
            base_url: Optional base URL for the API (default: https://api.flowmaestro.io).
            timeout: Request timeout in seconds (default: 30.0).
            max_retries: Maximum retry attempts (default: 3).
            headers: Optional custom headers to include with every request.
        """
        if not api_key:
            raise ValueError("API key is required")

        self._http = SyncHttpClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            headers=headers,
        )
        self._sse = SyncSSEClient(
            api_key=api_key,
            base_url=self._http.base_url,
            headers=headers,
        )

        # Initialize resources
        self.workflows = SyncWorkflows(self._http)
        self.executions = SyncExecutions(self._http, self._sse)
        self.agents = SyncAgents(self._http)
        self.threads = SyncThreads(self._http, self._sse)
        self.triggers = SyncTriggers(self._http)
        self.knowledge_bases = SyncKnowledgeBases(self._http)
        self.webhooks = SyncWebhooks(self._http)

    def close(self) -> None:
        """Close the client and release resources."""
        self._http.close()

    def __enter__(self) -> FlowMaestroClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


class AsyncFlowMaestroClient:
    """
    Asynchronous FlowMaestro API client.

    Example:
        import asyncio
        from flowmaestro import AsyncFlowMaestroClient

        async def main():
            client = AsyncFlowMaestroClient(api_key="fm_live_...")

            # Execute a workflow
            response = await client.workflows.execute("wf_123", inputs={"name": "John"})
            execution_id = response["data"]["execution_id"]

            # Wait for completion
            result = await client.executions.wait_for_completion(execution_id)
            print(f"Result: {result['outputs']}")

            # Clean up
            await client.close()

        asyncio.run(main())

    Using as context manager:
        async with AsyncFlowMaestroClient(api_key="fm_live_...") as client:
            response = await client.workflows.list()
            print(response["data"])
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        """
        Create a new async FlowMaestro client.

        Args:
            api_key: Your FlowMaestro API key.
            base_url: Optional base URL for the API (default: https://api.flowmaestro.io).
            timeout: Request timeout in seconds (default: 30.0).
            max_retries: Maximum retry attempts (default: 3).
            headers: Optional custom headers to include with every request.
        """
        if not api_key:
            raise ValueError("API key is required")

        self._http = AsyncHttpClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            headers=headers,
        )
        self._sse = AsyncSSEClient(
            api_key=api_key,
            base_url=self._http.base_url,
            headers=headers,
        )

        # Initialize resources
        self.workflows = AsyncWorkflows(self._http)
        self.executions = AsyncExecutions(self._http, self._sse)
        self.agents = AsyncAgents(self._http)
        self.threads = AsyncThreads(self._http, self._sse)
        self.triggers = AsyncTriggers(self._http)
        self.knowledge_bases = AsyncKnowledgeBases(self._http)
        self.webhooks = AsyncWebhooks(self._http)

    async def close(self) -> None:
        """Close the client and release resources."""
        await self._http.close()

    async def __aenter__(self) -> AsyncFlowMaestroClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
