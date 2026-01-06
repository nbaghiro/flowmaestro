"""
Webhooks resource.
"""
from __future__ import annotations

from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sync_client import SyncHttpClient
from ..types import WebhookEventType


class SyncWebhooks:
    """Synchronous webhooks resource."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all webhooks.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with webhooks.

        Example:
            response = client.webhooks.list()
            for webhook in response["data"]:
                print(f"- {webhook['name']}: {webhook['url']}")
                print(f"  Events: {', '.join(webhook['events'])}")
                print(f"  Active: {webhook['is_active']}")
        """
        return self._http.get(
            "/api/v1/webhooks",
            params={"page": page, "per_page": per_page},
        )

    def get(self, webhook_id: str) -> dict[str, Any]:
        """
        Get a webhook by ID.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Response containing the webhook.

        Example:
            response = client.webhooks.get("wh_123")
            webhook = response["data"]
            print(f"Webhook: {webhook['name']}")
            print(f"URL: {webhook['url']}")
        """
        return self._http.get(f"/api/v1/webhooks/{webhook_id}")

    def create(
        self,
        name: str,
        url: str,
        events: list[WebhookEventType],
        *,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new webhook.

        Args:
            name: The webhook name.
            url: The webhook URL.
            events: List of events to subscribe to.
            headers: Optional custom headers.

        Returns:
            Response containing the created webhook.

        Example:
            response = client.webhooks.create(
                name="My Webhook",
                url="https://my-app.com/webhook",
                events=["execution.completed", "execution.failed"],
                headers={"X-Custom-Header": "my-value"}
            )
            webhook = response["data"]
            print(f"Created webhook: {webhook['id']}")
        """
        return self._http.post(
            "/api/v1/webhooks",
            json={
                "name": name,
                "url": url,
                "events": events,
                "headers": headers,
            },
        )

    def delete(self, webhook_id: str) -> dict[str, Any]:
        """
        Delete a webhook.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Empty response on success.

        Example:
            client.webhooks.delete("wh_123")
            print("Webhook deleted")
        """
        return self._http.delete(f"/api/v1/webhooks/{webhook_id}")

    def test(self, webhook_id: str) -> dict[str, Any]:
        """
        Test a webhook by sending a test event.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Response containing test results.

        Example:
            response = client.webhooks.test("wh_123")
            result = response["data"]
            if result["success"]:
                print(f"Webhook responded in {result['response_time_ms']}ms")
            else:
                print(f"Webhook test failed: {result.get('error')}")
        """
        return self._http.post(f"/api/v1/webhooks/{webhook_id}/test")


class AsyncWebhooks:
    """Asynchronous webhooks resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all webhooks.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with webhooks.

        Example:
            response = await client.webhooks.list()
            for webhook in response["data"]:
                print(f"- {webhook['name']}: {webhook['url']}")
                print(f"  Events: {', '.join(webhook['events'])}")
                print(f"  Active: {webhook['is_active']}")
        """
        return await self._http.get(
            "/api/v1/webhooks",
            params={"page": page, "per_page": per_page},
        )

    async def get(self, webhook_id: str) -> dict[str, Any]:
        """
        Get a webhook by ID.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Response containing the webhook.

        Example:
            response = await client.webhooks.get("wh_123")
            webhook = response["data"]
            print(f"Webhook: {webhook['name']}")
            print(f"URL: {webhook['url']}")
        """
        return await self._http.get(f"/api/v1/webhooks/{webhook_id}")

    async def create(
        self,
        name: str,
        url: str,
        events: list[WebhookEventType],
        *,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new webhook.

        Args:
            name: The webhook name.
            url: The webhook URL.
            events: List of events to subscribe to.
            headers: Optional custom headers.

        Returns:
            Response containing the created webhook.

        Example:
            response = await client.webhooks.create(
                name="My Webhook",
                url="https://my-app.com/webhook",
                events=["execution.completed", "execution.failed"],
                headers={"X-Custom-Header": "my-value"}
            )
            webhook = response["data"]
            print(f"Created webhook: {webhook['id']}")
        """
        return await self._http.post(
            "/api/v1/webhooks",
            json={
                "name": name,
                "url": url,
                "events": events,
                "headers": headers,
            },
        )

    async def delete(self, webhook_id: str) -> dict[str, Any]:
        """
        Delete a webhook.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Empty response on success.

        Example:
            await client.webhooks.delete("wh_123")
            print("Webhook deleted")
        """
        return await self._http.delete(f"/api/v1/webhooks/{webhook_id}")

    async def test(self, webhook_id: str) -> dict[str, Any]:
        """
        Test a webhook by sending a test event.

        Args:
            webhook_id: The webhook ID.

        Returns:
            Response containing test results.

        Example:
            response = await client.webhooks.test("wh_123")
            result = response["data"]
            if result["success"]:
                print(f"Webhook responded in {result['response_time_ms']}ms")
            else:
                print(f"Webhook test failed: {result.get('error')}")
        """
        return await self._http.post(f"/api/v1/webhooks/{webhook_id}/test")
